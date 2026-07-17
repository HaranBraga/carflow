import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  active: z.boolean().optional(),
  dailyRate: z.number().positive().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const data = schema.parse(await req.json());

  const washer = await prisma.washer.update({
    where: { id },
    data,
  });

  return NextResponse.json(washer);
}
