import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";

const PERIODS: Record<string, number | null> = {
  month: 0,
  "3months": 3,
  "6months": 6,
  all: null,
};

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month";
  const monthsBack = PERIODS[period] ?? 0;

  const now = new Date();
  const monthEnd = endOfMonth(now);
  const periodStart = monthsBack === null
    ? new Date(0)
    : monthsBack === 0
      ? startOfMonth(now)
      : startOfMonth(subMonths(now, monthsBack));
  const thirtyDaysAgo = subDays(now, 30);
  const evolutionStart = startOfMonth(subMonths(now, 11));

  const [topCustomersRaw, topServicesRaw, byCategoryRaw, ticketRaw, inactiveCount, evolutionRaw] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT c.id as "customerId", c.name, SUM(so."totalAmount") as total
      FROM service_orders so
      JOIN vehicles v ON so."vehicleId" = v.id
      JOIN customers c ON v."customerId" = c.id
      WHERE so."arrivedAt" >= ${periodStart}
        AND so."arrivedAt" <= ${monthEnd}
        AND so.status IN ('FINISHED', 'DELIVERED')
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 10
    `,
    prisma.$queryRaw<any[]>`
      SELECT s.name as "serviceName", COUNT(oi.id) as count, SUM(oi.total) as revenue
      FROM order_items oi
      JOIN services s ON oi."serviceId" = s.id
      JOIN service_orders so ON oi."orderId" = so.id
      WHERE so."arrivedAt" >= ${periodStart}
        AND so."arrivedAt" <= ${monthEnd}
      GROUP BY s.name
      ORDER BY revenue DESC
      LIMIT 10
    `,
    prisma.$queryRaw<any[]>`
      SELECT v.category, COUNT(so.id) as count
      FROM service_orders so
      JOIN vehicles v ON so."vehicleId" = v.id
      WHERE so."arrivedAt" >= ${periodStart}
        AND so."arrivedAt" <= ${monthEnd}
      GROUP BY v.category
      ORDER BY count DESC
    `,
    prisma.serviceOrder.aggregate({
      where: { status: { in: ["FINISHED", "DELIVERED"] } },
      _avg: { totalAmount: true },
    }),
    prisma.$queryRaw<any[]>`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      WHERE NOT EXISTS (
        SELECT 1 FROM service_orders so
        JOIN vehicles v ON so."vehicleId" = v.id
        WHERE v."customerId" = c.id
          AND so."arrivedAt" >= ${thirtyDaysAgo}
      )
    `,
    prisma.$queryRaw<any[]>`
      SELECT to_char(date_trunc('month', so."arrivedAt"), 'YYYY-MM') as month,
             SUM(so."totalAmount") as total,
             COUNT(so.id) as count
      FROM service_orders so
      WHERE so."arrivedAt" >= ${evolutionStart}
        AND so.status IN ('FINISHED', 'DELIVERED')
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ]);

  return NextResponse.json({
    period,
    topCustomers: topCustomersRaw.map((r) => ({ ...r, total: Number(r.total) })),
    topServices: topServicesRaw.map((r) => ({ ...r, count: Number(r.count), revenue: Number(r.revenue) })),
    byCategory: byCategoryRaw.map((r) => ({ ...r, count: Number(r.count) })),
    ticketMedio: Number(ticketRaw._avg.totalAmount ?? 0),
    inactiveCount: Number(inactiveCount[0]?.count ?? 0),
    evolution: evolutionRaw.map((r) => ({ month: r.month, total: Number(r.total), count: Number(r.count) })),
  });
}
