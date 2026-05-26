import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { startOfMonth, endOfMonth, subDays } from "date-fns";

export async function GET() {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thirtyDaysAgo = subDays(now, 30);

  const [topCustomersRaw, topServicesRaw, byCategoryRaw, ticketRaw, inactiveCount] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT c.id as "customerId", c.name, SUM(so."totalAmount") as total
      FROM service_orders so
      JOIN vehicles v ON so."vehicleId" = v.id
      JOIN customers c ON v."customerId" = c.id
      WHERE so."arrivedAt" >= ${monthStart}
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
      WHERE so."arrivedAt" >= ${monthStart}
      GROUP BY s.name
      ORDER BY revenue DESC
      LIMIT 10
    `,
    prisma.$queryRaw<any[]>`
      SELECT v.category, COUNT(so.id) as count
      FROM service_orders so
      JOIN vehicles v ON so."vehicleId" = v.id
      WHERE so."arrivedAt" >= ${monthStart}
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
  ]);

  return NextResponse.json({
    topCustomers: topCustomersRaw.map((r) => ({ ...r, total: Number(r.total) })),
    topServices: topServicesRaw.map((r) => ({ ...r, count: Number(r.count), revenue: Number(r.revenue) })),
    byCategory: byCategoryRaw.map((r) => ({ ...r, count: Number(r.count) })),
    ticketMedio: Number(ticketRaw._avg.totalAmount ?? 0),
    inactiveCount: Number(inactiveCount[0]?.count ?? 0),
  });
}
