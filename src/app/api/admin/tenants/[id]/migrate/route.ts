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

    // Pré-migração: converte colunas de enum para texto antes do db push
    try {
      await tenantPrisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Converte vehicles.category de enum para text (preservando dados)
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'vehicles' AND column_name = 'category'
            AND udt_name NOT IN ('text', 'varchar')
          ) THEN
            ALTER TABLE vehicles ADD COLUMN category_new TEXT DEFAULT 'POPULAR';
            UPDATE vehicles SET category_new = category::text;
            ALTER TABLE vehicles DROP COLUMN category;
            ALTER TABLE vehicles RENAME COLUMN category_new TO category;
            ALTER TABLE vehicles ALTER COLUMN category SET NOT NULL;
          END IF;

          -- Converte service_prices.category de enum para text (preservando dados)
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'service_prices' AND column_name = 'category'
            AND udt_name NOT IN ('text', 'varchar')
          ) THEN
            ALTER TABLE service_prices ADD COLUMN category_new TEXT;
            UPDATE service_prices SET category_new = category::text;
            ALTER TABLE service_prices DROP COLUMN category;
            ALTER TABLE service_prices RENAME COLUMN category_new TO category;
          END IF;

          -- Remove registros de TAPETE_RESIDENCIAL
          UPDATE vehicles SET category = 'POPULAR' WHERE category = 'TAPETE_RESIDENCIAL';
          DELETE FROM service_prices WHERE category = 'TAPETE_RESIDENCIAL';
        END $$;
      `);
      log.push("Pré-migração de tipos de veículo concluída.");
    } catch (e: any) {
      log.push(`Aviso: pré-migração parcial (${e.message}). Continuando...`);
    }

    execSync(
      "node node_modules/prisma/build/index.js db push --schema=prisma/tenant/schema.prisma --accept-data-loss --skip-generate",
      {
        env: { ...process.env, TENANT_DATABASE_URL: tenant.databaseUrl },
        stdio: "pipe",
      }
    );
    log.push("Schema sincronizado com sucesso.");

    // Pós-migração: seed dos tipos de veículo padrão
    try {
      await tenantPrisma.$executeRawUnsafe(`
        INSERT INTO vehicle_types (id, key, label, "order", active)
        VALUES
          ('POPULAR',      'POPULAR',      'Carro Popular',   1, true),
          ('SUV_MEDIO',    'SUV_MEDIO',    'SUV Médio',       2, true),
          ('SUV_GRANDE',   'SUV_GRANDE',   'SUV Grande',      3, true),
          ('CAMIONETE',    'CAMIONETE',    'Camionete',       4, true),
          ('VAN_CAMINHAO', 'VAN_CAMINHAO', 'Van / Caminhão',  5, true),
          ('MOTO',         'MOTO',         'Moto',            6, true)
        ON CONFLICT (key) DO NOTHING;
      `);

      // Aplica labels customizados salvos anteriormente
      await tenantPrisma.$executeRawUnsafe(`
        UPDATE vehicle_types vt
        SET label = vcl.label
        FROM vehicle_category_labels vcl
        WHERE vt.key = vcl.category
          AND vcl.label IS NOT NULL AND vcl.label != '';
      `).catch(() => {});

      log.push("Tipos de veículo inicializados.");
    } catch (e: any) {
      log.push(`Aviso: seed de tipos de veículo parcial (${e.message}).`);
    }

    return NextResponse.json({ ok: true, log });
  } catch (e: any) {
    return NextResponse.json({
      error: "Falha na migração: " + (e.stderr?.toString() || e.message),
      log,
    }, { status: 500 });
  }
}
