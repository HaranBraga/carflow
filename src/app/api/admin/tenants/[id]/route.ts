import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { masterPrisma } from "@/lib/prisma-master";

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  return token && token === process.env.ADMIN_SECRET;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const tenant = await masterPrisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: "ADMIN" },
        select: { id: true, name: true, username: true, email: true, active: true },
      },
    },
  });

  if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const {
    name, slug, phone, address, active,
    databaseUrl,
    evolutionApiUrl, evolutionApiKey, evolutionInstance,
  } = body;

  if (slug && slug !== "") {
    const existing = await masterPrisma.tenant.findUnique({ where: { slug } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Este slug já está em uso por outra empresa" }, { status: 400 });
    }
  }

  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    return NextResponse.json({ error: "DATABASE_URL deve começar com postgresql://" }, { status: 400 });
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (phone !== undefined) data.phone = phone || null;
  if (address !== undefined) data.address = address || null;
  if (active !== undefined) data.active = active;
  if (databaseUrl !== undefined) data.databaseUrl = databaseUrl;
  if (evolutionApiUrl !== undefined) data.evolutionApiUrl = evolutionApiUrl || null;
  if (evolutionApiKey !== undefined && evolutionApiKey !== "") data.evolutionApiKey = evolutionApiKey;
  if (evolutionInstance !== undefined) data.evolutionInstance = evolutionInstance || null;

  const tenant = await masterPrisma.tenant.update({
    where: { id },
    data,
    include: {
      users: {
        where: { role: "ADMIN" },
        select: { id: true, name: true, username: true, email: true, active: true },
      },
    },
  });

  return NextResponse.json(tenant);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAdminAuth()) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;

  await masterPrisma.tenant.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
