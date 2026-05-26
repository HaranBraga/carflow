import { getTenantPrisma } from "@/lib/prisma-tenant";
import { redirect } from "next/navigation";
import { formatCurrency, ORDER_STATUS_LABELS, VEHICLE_CATEGORY_LABELS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, DollarSign, Users, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";

export default async function DashboardPage() {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    redirect("/login");
  }

  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const [
    ordersToday,
    ordersInProgress,
    revenueToday,
    expensesToday,
    totalCustomers,
    recentOrders,
  ] = await Promise.all([
    prisma.serviceOrder.count({ where: { arrivedAt: { gte: start, lte: end } } }),
    prisma.serviceOrder.count({ where: { status: { in: ["WAITING", "IN_PROGRESS"] } } }),
    prisma.serviceOrder.aggregate({
      where: { arrivedAt: { gte: start, lte: end }, status: { in: ["FINISHED", "DELIVERED"] } },
      _sum: { totalAmount: true },
    }),
    prisma.cashFlow.aggregate({
      where: { type: "EXPENSE", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.customer.count(),
    prisma.serviceOrder.findMany({
      include: { vehicle: { include: { customer: true } }, washer: true },
      orderBy: { arrivedAt: "desc" },
      take: 6,
    }),
  ]);

  const revenue = Number(revenueToday._sum.totalAmount ?? 0);
  const expenses = Number(expensesToday._sum.amount ?? 0);
  const profit = revenue - expenses;

  const stats = [
    { title: "Carros Hoje", value: ordersToday, icon: Car, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Em Andamento", value: ordersInProgress, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { title: "Receita do Dia", value: formatCurrency(revenue), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { title: "Lucro do Dia", value: formatCurrency(profit), icon: TrendingUp, color: profit >= 0 ? "text-green-600" : "text-red-600", bg: profit >= 0 ? "bg-green-50" : "bg-red-50" },
    { title: "Total de Clientes", value: totalCustomers, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Despesas do Dia", value: formatCurrency(expenses), icon: CheckCircle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">{format(today, "EEEE, dd 'de' MMMM 'de' yyyy")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{title}</p>
                  <p className="text-xl font-bold truncate">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum atendimento hoje ainda</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{order.vehicle.plate} — {order.vehicle.customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {VEHICLE_CATEGORY_LABELS[order.vehicle.category]} • {format(order.arrivedAt, "HH:mm")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                      order.status === "FINISHED" ? "bg-green-100 text-green-800" :
                      order.status === "WAITING" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                    <p className="text-xs font-medium mt-1">{formatCurrency(Number(order.totalAmount))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
