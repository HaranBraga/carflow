import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const { contacted, notes } = await req.json();

  const op = await prisma.opportunity.update({
    where: { id },
    data: {
      ...(contacted !== undefined ? { contacted } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json(op);
}
