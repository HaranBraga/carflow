import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token && token === process.env.ADMIN_SECRET;
}

export async function GET() {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tenants = await prisma.tenant.findMany({
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

  const { tenantName, tenantSlug, phone, address, adminName, adminUsername, adminPassword } = await req.json();

  if (!tenantName || !tenantSlug || !adminName || !adminUsername || !adminPassword) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios" }, { status: 400 });
  }

  const slugExists = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (slugExists) {
    return NextResponse.json({ error: "Este slug já está em uso" }, { status: 400 });
  }

  const usernameExists = await prisma.user.findUnique({ where: { username: adminUsername } });
  if (usernameExists) {
    return NextResponse.json({ error: "Este usuário já existe" }, { status: 400 });
  }

  const hash = await bcrypt.hash(adminPassword, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      phone: phone || null,
      address: address || null,
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
