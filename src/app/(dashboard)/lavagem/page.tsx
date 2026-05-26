"use client";
import { useEffect, useState, useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, MessageCircle, Play, CheckCircle, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, VEHICLE_CATEGORY_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";

export default function LavagemPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/ordens?status=active");
    setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/ordens/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  }

  async function sendWhatsApp(orderId: string) {
    setSending(orderId);
    await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setSending(null);
    fetchOrders();
  }

  const waiting = orders.filter((o) => o.status === "WAITING");
  const inProgress = orders.filter((o) => o.status === "IN_PROGRESS");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Painel de Lavagem</h1>
          <Badge variant="info">{orders.length} em atendimento</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Nenhum veículo em atendimento</p>
            <Button className="mt-4" onClick={() => window.location.href = "/dashboard/entrada"}>
              Registrar Entrada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Aguardando */}
          <div>
            <h2 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              Aguardando Lavagem ({waiting.length})
            </h2>
            <div className="space-y-3">
              {waiting.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateStatus}
                  onSendWhatsApp={sendWhatsApp}
                  sending={sending === order.id}
                />
              ))}
              {waiting.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum veículo aguardando</p>}
            </div>
          </div>

          {/* Em lavagem */}
          <div>
            <h2 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Em Lavagem ({inProgress.length})
            </h2>
            <div className="space-y-3">
              {inProgress.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onStatusChange={updateStatus}
                  onSendWhatsApp={sendWhatsApp}
                  sending={sending === order.id}
                />
              ))}
              {inProgress.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum veículo em lavagem</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, onStatusChange, onSendWhatsApp, sending }: any) {
  const elapsed = formatDistanceToNow(new Date(order.arrivedAt), { locale: ptBR, addSuffix: false });

  return (
    <Card className="border-l-4" style={{ borderLeftColor: order.status === "IN_PROGRESS" ? "#3b82f6" : "#eab308" }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-lg font-mono">{order.vehicle.plate}</p>
            <p className="text-sm text-muted-foreground">{order.vehicle.brand} {order.vehicle.model}</p>
            <p className="text-xs">{VEHICLE_CATEGORY_LABELS[order.vehicle.category]}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{elapsed}</p>
          </div>
        </div>

        <div>
          <p className="font-medium text-sm">{order.vehicle.customer.name}</p>
          <p className="text-xs text-muted-foreground">{order.vehicle.customer.phone}</p>
        </div>

        {order.items.length > 0 && (
          <div className="text-xs space-y-0.5">
            {order.items.map((item: any) => (
              <p key={item.id} className="text-muted-foreground">• {item.service.name}</p>
            ))}
            <p className="font-semibold text-foreground mt-1">{formatCurrency(Number(order.totalAmount))}</p>
          </div>
        )}

        {order.washer && (
          <p className="text-xs text-muted-foreground">Lavador: {order.washer.name}</p>
        )}

        <div className="flex gap-2 flex-wrap">
          {order.status === "WAITING" && (
            <Button size="sm" onClick={() => onStatusChange(order.id, "IN_PROGRESS")} className="gap-1">
              <Play className="w-3 h-3" /> Iniciar
            </Button>
          )}
          {order.status === "IN_PROGRESS" && (
            <Button size="sm" variant="success" onClick={() => onStatusChange(order.id, "FINISHED")} className="gap-1">
              <CheckCircle className="w-3 h-3" /> Finalizar
            </Button>
          )}
          {(order.status === "FINISHED" || order.status === "IN_PROGRESS") && (
            <Button
              size="sm"
              variant={order.whatsappSent ? "outline" : "default"}
              onClick={() => onSendWhatsApp(order.id)}
              disabled={sending}
              className="gap-1"
            >
              <MessageCircle className="w-3 h-3" />
              {order.whatsappSent ? "Reenviado" : "Avisar no WhatsApp"}
            </Button>
          )}
          {order.status === "FINISHED" && (
            <Button size="sm" variant="outline" onClick={() => onStatusChange(order.id, "DELIVERED")} className="gap-1">
              <Package className="w-3 h-3" /> Entregue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
