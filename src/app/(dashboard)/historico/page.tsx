"use client";
import { useEffect, useState } from "react";
import { Car } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_CATEGORY_LABELS } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoricoPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch(`/api/historico?date=${today}`)
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders || []); setLoading(false); });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Car className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Lavagens do Dia</h1>
        <Badge variant="secondary">{orders.length} lavagens</Badge>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma lavagem finalizada hoje.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order, idx) => (
            <Card key={order.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <span className="text-muted-foreground text-sm font-mono w-5 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{order.vehicle.customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{order.vehicle.plate}</span>
                    {" · "}{VEHICLE_CATEGORY_LABELS[order.vehicle.category]}
                    {order.items?.length > 0 && " · " + order.items.map((i: any) => i.service.name).join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant={order.status === "DELIVERED" ? "secondary" : "outline"} className="text-xs">
                    {order.status === "DELIVERED" ? "Entregue" : "Finalizado"}
                  </Badge>
                  {order.finishedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(order.finishedAt), "HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
