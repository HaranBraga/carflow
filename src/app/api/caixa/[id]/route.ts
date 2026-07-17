import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const updateSchema = z.object({
  category: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  expenseType: z.enum(["MENSAL", "DIARIA", "INSUMOS"]).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const data = updateSchema.parse(await req.json());

  const entry = await prisma.cashFlow.update({ where: { id }, data });
  return NextResponse.json(entry);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;

  // Prevent deleting auto-generated entries linked to orders
  const entry = await prisma.cashFlow.findUnique({ where: { id }, select: { orderId: true } });
  if (entry?.orderId) {
    return NextResponse.json({ error: "Não é possível excluir lançamento gerado por ordem de serviço." }, { status: 400 });
  }

  await prisma.cashFlow.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
