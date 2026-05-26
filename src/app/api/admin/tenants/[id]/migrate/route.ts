import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { masterPrisma } from "@/lib/prisma-master";
import { getTenantPrismaByUrl } from "@/lib/prisma-tenant";
import { execSync } from "child_process";

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token && token === process.env.ADMIN_SECRET;
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const tenant = await masterPrisma.tenant.findUnique({ where: { id } });
  if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

  const log: string[] = [];

  try {
    const tenantPrisma = getTenantPrismaByUrl(tenant.databaseUrl);

    let mergedCount = 0;
    try {
      const duplicates: { phone: string; ids: string[] }[] = await tenantPrisma.$queryRaw`
        SELECT phone, array_agg(id ORDER BY "createdAt" ASC) AS ids
        FROM customers
        GROUP BY phone
        HAVING COUNT(*) > 1
      `;

      for (const dup of duplicates) {
        const [keeper, ...losers] = dup.ids;
        if (losers.length === 0) continue;

        await tenantPrisma.$executeRawUnsafe(
          `UPDATE vehicles SET "customerId" = $1 WHERE "customerId" = ANY($2::text[])`,
          keeper,
          losers
        );
        await tenantPrisma.$executeRawUnsafe(
          `UPDATE feedbacks SET "customerId" = $1 WHERE "customerId" = ANY($2::text[])`,
          keeper,
          losers
        );
        await tenantPrisma.$executeRawUnsafe(
          `DELETE FROM customers WHERE id = ANY($1::text[])`,
          losers
        );
        mergedCount += losers.length;
      }

      if (mergedCount > 0) {
        log.push(`${mergedCount} cliente(s) duplicado(s) mesclados pelo telefone.`);
      }
    } catch (e: any) {
      log.push(`Aviso: falha ao limpar duplicatas (${e.message}). Continuando...`);
    }

    execSync(
      "node node_modules/prisma/build/index.js db push --schema=prisma/tenant/schema.prisma --accept-data-loss --skip-generate",
      {
        env: { ...process.env, TENANT_DATABASE_URL: tenant.databaseUrl },
        stdio: "pipe",
      }
    );
    log.push("Schema sincronizado com sucesso.");

    return NextResponse.json({ ok: true, log });
  } catch (e: any) {
    return NextResponse.json({
      error: "Falha na migração: " + (e.stderr?.toString() || e.message),
      log,
    }, { status: 500 });
  }
}
