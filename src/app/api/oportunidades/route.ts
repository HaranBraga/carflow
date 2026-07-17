import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { searchParams } = new URL(req.url);
  const contacted = searchParams.get("contacted");

  const opportunities = await prisma.opportunity.findMany({
    where: {
      ...(contacted === "false" ? { contacted: false } : {}),
      ...(contacted === "true" ? { contacted: true } : {}),
    },
    include: {
      order: {
        include: {
          vehicle: { include: { customer: true } },
        },
      },
    },
    orderBy: { order: { arrivedAt: "desc" } },
  });

  return NextResponse.json(opportunities);
}
