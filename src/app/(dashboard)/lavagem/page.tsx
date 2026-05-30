"use client";
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, MessageCircle, Play, CheckCircle, Package, RefreshCw, AlertTriangle, Lightbulb, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, VEHICLE_CATEGORY_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";

type ModalType = "avaria" | "oportunidade" | null;

export default function LavagemPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: ModalType; orderId: string } | null>(null);
  const [modalForm, setModalForm] = useState({ text: "", value: "" });
  const [modalSaving, setModalSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/ordens?status=active");
    setOrders(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
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

  async function finishAndSend(orderId: string) {
    setSending(orderId);
    await fetch(`/api/ordens/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "FINISHED" }),
    });
    const res = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(null);
    if (!res.ok || !data.sent) {
      const parts = ["Carro finalizado, mas falha ao enviar WhatsApp."];
      if (data.number) parts.push(`Número: ${data.number}`);
      if (data.error) parts.push(`Erro: ${data.error}`);
      alert(parts.join("\n\n"));
    }
    fetchOrders();
  }

  async function saveModal() {
    if (!modal || !modalForm.text.trim()) return;
    setModalSaving(true);

    const body: any = {};
    if (modal.type === "avaria") {
      body.addChecklist = { area: "Avaria", notes: modalForm.text.trim() };
    } else {
      body.addOpportunity = {
        description: modalForm.text.trim(),
        estimatedValue: modalForm.value ? parseFloat(modalForm.value) : undefined,
      };
    }

    await fetch(`/api/ordens/${modal.orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setModalSaving(false);
    setModal(null);
    setModalForm({ text: "", value: "" });
    fetchOrders();
  }

  const waiting    = orders.filter((o) => o.status === "WAITING");
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
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Car className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-muted-foreground">Nenhum veículo em atendimento</p>
            <Button className="mt-4" onClick={() => window.location.href = "/entrada"}>
              Registrar Entrada
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
              Aguardando ({waiting.length})
            </h2>
            <div className="space-y-3">
              {waiting.map((order) => (
                <OrderCard
                  key={order.id} order={order}
                  onStatusChange={updateStatus}
                  onFinishAndSend={finishAndSend}
                  onModal={(type) => { setModal({ type, orderId: order.id }); setModalForm({ text: "", value: "" }); }}
                  sending={sending === order.id}
                />
              ))}
              {waiting.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum veículo aguardando</p>}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Em Lavagem ({inProgress.length})
            </h2>
            <div className="space-y-3">
              {inProgress.map((order) => (
                <OrderCard
                  key={order.id} order={order}
                  onStatusChange={updateStatus}
                  onFinishAndSend={finishAndSend}
                  onModal={(type) => { setModal({ type, orderId: order.id }); setModalForm({ text: "", value: "" }); }}
                  sending={sending === order.id}
                />
              ))}
              {inProgress.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum veículo em lavagem</p>}
            </div>
          </div>
        </div>
      )}

      {/* Modal avaria/oportunidade */}
      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) setModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modal?.type === "avaria"
                ? <><AlertTriangle className="w-4 h-4 text-orange-500" /> Registrar Avaria</>
                : <><Lightbulb className="w-4 h-4 text-yellow-500" /> Adicionar Oportunidade</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{modal?.type === "avaria" ? "Descrição da avaria" : "Serviço a oferecer"}</Label>
              <Textarea
                value={modalForm.text}
                onChange={(e) => setModalForm({ ...modalForm, text: e.target.value })}
                placeholder={modal?.type === "avaria" ? "Ex: Arranhão no para-choque..." : "Ex: Polimento lateral..."}
                rows={3}
                autoFocus
              />
            </div>
            {modal?.type === "oportunidade" && (
              <div>
                <Label>Valor estimado (R$) <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={modalForm.value}
                  onChange={(e) => setModalForm({ ...modalForm, value: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModal(null)} disabled={modalSaving}>Cancelar</Button>
              <Button className="flex-1" onClick={saveModal} disabled={modalSaving || !modalForm.text.trim()}>
                {modalSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderCard({ order, onStatusChange, onFinishAndSend, onModal, sending }: any) {
  const elapsed = formatDistanceToNow(new Date(order.arrivedAt), { locale: ptBR, addSuffix: false });

  return (
    <Card className="border-l-4" style={{ borderLeftColor: order.status === "IN_PROGRESS" ? "#3b82f6" : "#eab308" }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-lg font-mono">{order.vehicle.plate}</p>
            <p className="text-sm font-medium">{order.vehicle.customer.name}</p>
            <p className="text-xs text-muted-foreground">{VEHICLE_CATEGORY_LABELS[order.vehicle.category]}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{elapsed}</p>
          </div>
        </div>

        {order.items?.length > 0 && (
          <div className="text-xs space-y-0.5">
            {order.items.map((item: any) => (
              <p key={item.id} className="text-muted-foreground">• {item.service.name}</p>
            ))}
            <p className="font-semibold text-foreground mt-1">{formatCurrency(Number(order.totalAmount))}</p>
          </div>
        )}

        {order.checklist?.filter((c: any) => c.hasIssue).length > 0 && (
          <div className="text-xs text-orange-600 flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{order.checklist.filter((c: any) => c.hasIssue).map((c: any) => c.notes || c.area).join("; ")}</span>
          </div>
        )}

        {order.opportunities?.length > 0 && (
          <div className="text-xs text-yellow-700 flex items-start gap-1">
            <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{order.opportunities.map((o: any) => o.description).join("; ")}</span>
          </div>
        )}

        {/* Botões de ação secundária */}
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="ghost" className="text-xs gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-7 px-2"
            onClick={() => onModal("avaria")}>
            <AlertTriangle className="w-3 h-3" /> Avaria
          </Button>
          <Button size="sm" variant="ghost" className="text-xs gap-1 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 h-7 px-2"
            onClick={() => onModal("oportunidade")}>
            <Lightbulb className="w-3 h-3" /> Oportunidade
          </Button>
        </div>

        {/* Botões principais */}
        <div className="flex gap-2 flex-wrap">
          {order.status === "WAITING" && (
            <Button size="sm" onClick={() => onStatusChange(order.id, "IN_PROGRESS")} className="gap-1">
              <Play className="w-3 h-3" /> Iniciar
            </Button>
          )}
          {order.status === "IN_PROGRESS" && (
            <>
              <Button size="sm" variant="success" onClick={() => onFinishAndSend(order.id)} disabled={sending} className="gap-1">
                <MessageCircle className="w-3 h-3" />
                {sending ? "Enviando..." : "Finalizar e Avisar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onStatusChange(order.id, "FINISHED")} disabled={sending} className="gap-1">
                <CheckCircle className="w-3 h-3" /> Só Finalizar
              </Button>
            </>
          )}
          {order.status === "FINISHED" && (
            <div className="flex items-center gap-2 w-full flex-wrap">
              <Button size="sm" variant="outline" onClick={() => onStatusChange(order.id, "DELIVERED")} className="gap-1">
                <Package className="w-3 h-3" /> Entregue
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => window.open(`/imprimir/${order.id}`, "_blank")}
                className="gap-1">
                <Printer className="w-3 h-3" /> Imprimir
              </Button>
              {order.whatsappSent && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> Aviso enviado
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
