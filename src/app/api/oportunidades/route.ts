import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function GET(req: NextRequest) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
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
