import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function GET(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toLocaleDateString("en-CA");

  // Parseia como meia-noite LOCAL (America/Sao_Paulo) para evitar deslocamento UTC
  const [year, month, day] = dateStr.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end   = new Date(year, month - 1, day, 23, 59, 59, 999);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      status: { in: ["FINISHED", "DELIVERED"] },
      finishedAt: { gte: start, lte: end },
    },
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
      washer: true,
    },
    orderBy: { finishedAt: "desc" },
  });

  const total = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return NextResponse.json({ orders, total, count: orders.length });
}
