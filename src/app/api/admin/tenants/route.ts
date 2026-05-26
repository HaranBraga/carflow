import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { masterPrisma } from "@/lib/prisma-master";
import { getTenantPrismaByUrl } from "@/lib/prisma-tenant";
import bcrypt from "bcryptjs";
import { execSync } from "child_process";

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token && token === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenants = await masterPrisma.tenant.findMany({
    include: {
      users: {
        where: { role: "ADMIN" },
        select: { id: true, name: true, username: true, email: true, active: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const {
    tenantName, tenantSlug, phone, address,
    databaseUrl,
    evolutionApiUrl, evolutionApiKey, evolutionInstance,
    adminName, adminUsername, adminPassword,
  } = await req.json();

  if (!tenantName || !tenantSlug || !databaseUrl || !adminName || !adminUsername || !adminPassword) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios" }, { status: 400 });
  }

  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    return NextResponse.json({ error: "DATABASE_URL deve começar com postgresql://" }, { status: 400 });
  }

  const slugExists = await masterPrisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (slugExists) {
    return NextResponse.json({ error: "Este slug já está em uso" }, { status: 400 });
  }

  const usernameExists = await masterPrisma.user.findUnique({ where: { username: adminUsername } });
  if (usernameExists) {
    return NextResponse.json({ error: "Este usuário já existe" }, { status: 400 });
  }

  try {
    execSync(
      "node node_modules/prisma/build/index.js db push --schema=prisma/tenant/schema.prisma --accept-data-loss --skip-generate",
      {
        env: { ...process.env, TENANT_DATABASE_URL: databaseUrl },
        stdio: "pipe",
      }
    );
  } catch (e: any) {
    return NextResponse.json({
      error: "Falha ao conectar/migrar o banco da empresa: " + (e.stderr?.toString() || e.message),
    }, { status: 500 });
  }

  try {
    const tenantClient = getTenantPrismaByUrl(databaseUrl);
    const defaultServices = [
      { name: "Lavagem Simples", basePrice: 30, description: "Lavagem externa completa" },
      { name: "Lavagem Completa", basePrice: 50, description: "Lavagem externa + aspiração interna" },
    ];
    for (const svc of defaultServices) {
      await tenantClient.service.upsert({
        where: { id: `seed-${svc.name}` },
        update: {},
        create: { id: `seed-${svc.name}`, ...svc },
      });
    }
  } catch (e: any) {
    console.error("Falha ao seed dos serviços:", e);
  }

  const hash = await bcrypt.hash(adminPassword, 10);

  const tenant = await masterPrisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      phone: phone || null,
      address: address || null,
      databaseUrl,
      evolutionApiUrl: evolutionApiUrl || null,
      evolutionApiKey: evolutionApiKey || null,
      evolutionInstance: evolutionInstance || null,
      users: {
        create: {
          name: adminName,
          username: adminUsername,
          email: `${adminUsername}@carflow.local`,
          passwordHash: hash,
          role: "ADMIN",
        },
      },
    },
    include: {
      users: { select: { id: true, name: true, username: true, email: true } },
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
