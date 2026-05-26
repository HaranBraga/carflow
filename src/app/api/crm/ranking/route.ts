import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subDays } from "date-fns";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thirtyDaysAgo = subDays(now, 30);

  const [topCustomersRaw, topServicesRaw, byCategoryRaw, ticketRaw, inactiveCount] = await Promise.all([
    // Top customers do mês por valor
    prisma.$queryRaw<any[]>`
      SELECT c.id as "customerId", c.name, SUM(so."totalAmount") as total
      FROM service_orders so
      JOIN vehicles v ON so."vehicleId" = v.id
      JOIN customers c ON v."customerId" = c.id
      WHERE so."tenantId" = ${tenantId}
        AND so."arrivedAt" >= ${monthStart}
        AND so."arrivedAt" <= ${monthEnd}
        AND so.status IN ('FINISHED', 'DELIVERED')
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 10
    `,
    // Top serviços por receita
    prisma.$queryRaw<any[]>`
      SELECT s.name as "serviceName", COUNT(oi.id) as count, SUM(oi.total) as revenue
      FROM order_items oi
      JOIN services s ON oi."serviceId" = s.id
      JOIN service_orders so ON oi."orderId" = so.id
      WHERE so."tenantId" = ${tenantId}
        AND so."arrivedAt" >= ${monthStart}
      GROUP BY s.name
      ORDER BY revenue DESC
      LIMIT 10
    `,
    // Por categoria de veículo
    prisma.$queryRaw<any[]>`
      SELECT v.category, COUNT(so.id) as count
      FROM service_orders so
      JOIN vehicles v ON so."vehicleId" = v.id
      WHERE so."tenantId" = ${tenantId}
        AND so."arrivedAt" >= ${monthStart}
      GROUP BY v.category
      ORDER BY count DESC
    `,
    // Ticket médio
    prisma.serviceOrder.aggregate({
      where: { tenantId, status: { in: ["FINISHED", "DELIVERED"] } },
      _avg: { totalAmount: true },
    }),
    // Clientes inativos (sem visita em 30 dias)
    prisma.$queryRaw<any[]>`
      SELECT COUNT(DISTINCT c.id) as count
      FROM customers c
      WHERE c."tenantId" = ${tenantId}
        AND NOT EXISTS (
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
