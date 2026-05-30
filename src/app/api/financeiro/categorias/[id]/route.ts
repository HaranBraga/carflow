import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const { name } = await req.json();
  const cat = await prisma.cashFlowCategory.update({ where: { id }, data: { name } });
  return NextResponse.json(cat);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  await prisma.cashFlowCategory.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
