import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ name: z.string().min(2).optional(), active: z.boolean().optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const data = schema.parse(await req.json());
  const cat = await prisma.serviceCategory.update({ where: { id }, data });
  return NextResponse.json(cat);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  await prisma.serviceCategory.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
