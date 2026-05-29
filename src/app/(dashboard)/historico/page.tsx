"use client";
import { useEffect, useState } from "react";
import { History, DollarSign, Car, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, VEHICLE_CATEGORY_LABELS } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoricoPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<{ orders: any[]; total: number; count: number }>({ orders: [], total: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  async function load(d: string) {
    setLoading(true);
    const res = await fetch(`/api/historico?date=${d}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(date); }, [date]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Histórico</h1>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
      </div>

      {/* Resumo do dia */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Car className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Carros</p>
              <p className="text-2xl font-bold">{data.count}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Receita</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(data.total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><CheckCircle className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket médio</p>
              <p className="text-2xl font-bold">{formatCurrency(data.count ? data.total / data.count : 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : data.orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum serviço finalizado neste dia.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold">{order.vehicle.customer.name}</p>
                      <span className="font-mono text-sm text-muted-foreground">{order.vehicle.plate}</span>
                      <Badge variant={order.status === "DELIVERED" ? "secondary" : "outline"} className="text-xs">
                        {order.status === "DELIVERED" ? "Entregue" : "Finalizado"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {VEHICLE_CATEGORY_LABELS[order.vehicle.category]}
                      {order.finishedAt && ` • ${format(new Date(order.finishedAt), "HH:mm", { locale: ptBR })}`}
                      {order.washer && ` • ${order.washer.name}`}
                    </p>
                    {order.items.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.items.map((i: any) => i.service.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="font-bold text-green-600 shrink-0">
                    {formatCurrency(Number(order.totalAmount))}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
