import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

function generateKey(label: string): string {
  return label
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

export async function GET() {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const types = await prisma.vehicleType.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { label } = await req.json();
  if (!label?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

  let key = generateKey(label.trim());
  if (!key) return NextResponse.json({ error: "Nome inválido" }, { status: 400 });

  const existing = await prisma.vehicleType.findFirst({ where: { key } });
  if (existing) key = `${key}_${Date.now()}`;

  const maxOrder = await prisma.vehicleType.aggregate({ _max: { order: true } });
  const order = (maxOrder._max.order ?? 0) + 1;

  const type = await prisma.vehicleType.create({
    data: { key, label: label.trim(), order },
  });
  return NextResponse.json(type, { status: 201 });
}

export async function PUT(req: NextRequest) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id, label } = await req.json();
  if (!id || !label?.trim()) {
    return NextResponse.json({ error: "id e nome obrigatórios" }, { status: 400 });
  }

  const type = await prisma.vehicleType.update({
    where: { id },
    data: { label: label.trim() },
  });
  return NextResponse.json(type);
}

export async function DELETE(req: NextRequest) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const vt = await prisma.vehicleType.findUnique({ where: { id } });
  if (!vt) return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 });

  const vehicleCount = await prisma.vehicle.count({ where: { category: vt.key } });
  if (vehicleCount > 0) {
    return NextResponse.json(
      { error: `Tipo em uso por ${vehicleCount} veículo(s). Não é possível excluir.` },
      { status: 409 }
    );
  }

  await prisma.vehicleType.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
