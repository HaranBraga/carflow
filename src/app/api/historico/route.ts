import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr);

  const orders = await prisma.serviceOrder.findMany({
    where: {
      status: { in: ["FINISHED", "DELIVERED"] },
      finishedAt: { gte: startOfDay(date), lte: endOfDay(date) },
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
