import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
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
