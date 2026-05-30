"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ImprimirPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const [data, setData] = useState<any>(null);
  const [qr, setQr] = useState<{ feedbackUrl: string; qrCodeDataUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const orderRes = await fetch(`/api/ordens/${orderId}`);
        if (!orderRes.ok) throw new Error("Ordem não encontrada");
        const order = await orderRes.json();
        setData(order);

        // Auto-cria/busca feedback linkado a esta ordem
        const fbRes = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId: order.vehicle.customer.id, orderId }),
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          setQr({ feedbackUrl: fbData.feedbackUrl, qrCodeDataUrl: fbData.qrCodeDataUrl });
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-center text-red-600">{error || "Erro ao carregar"}</div>;
  }

  const order = data;

  return (
    <>
      {/* Botão imprimir — oculto na impressão */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} className="gap-2 shadow-lg">
          <Printer className="w-4 h-4" /> Imprimir
        </Button>
      </div>

      {/* Comprovante */}
      <div className="max-w-sm mx-auto p-6 space-y-4 print:p-0 print:max-w-none print:shadow-none">
        {/* Cabeçalho */}
        <div className="text-center border-b pb-4">
          <h1 className="text-xl font-bold">{order.managerName || "Lava-Jato"}</h1>
          <p className="text-xs text-muted-foreground mt-1">Comprovante de Serviço</p>
          <p className="text-xs text-muted-foreground">
            {order.finishedAt
              ? format(new Date(order.finishedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : format(new Date(order.arrivedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Dados do cliente */}
        <div className="space-y-1">
          <p className="text-sm"><span className="text-muted-foreground">Cliente:</span> <strong>{order.vehicle.customer.name}</strong></p>
          <p className="text-sm"><span className="text-muted-foreground">Veículo:</span> {order.vehicle.plate} {order.vehicle.model ? `— ${order.vehicle.model}` : ""}</p>
          {order.washer && <p className="text-sm"><span className="text-muted-foreground">Lavador:</span> {order.washer.name}</p>}
        </div>

        {/* Serviços */}
        {order.items?.length > 0 && (
          <div className="border-t border-b py-3 space-y-1">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.service.name}</span>
                <span className="font-medium">{formatCurrency(Number(item.unitPrice))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(Number(order.totalAmount))}</span>
            </div>
          </div>
        )}

        {/* QR Code de avaliação */}
        {qr && (
          <div className="text-center space-y-2 pt-2">
            <p className="text-sm font-medium">Avalie nosso serviço!</p>
            <p className="text-xs text-muted-foreground">Escaneie o QR code e ganhe um desconto na próxima visita</p>
            <img src={qr.qrCodeDataUrl} alt="QR Code avaliação" className="mx-auto w-36 h-36" />
            <p className="text-xs text-muted-foreground break-all">{qr.feedbackUrl}</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2 border-t">
          Obrigado pela preferência! 🙏
        </p>
      </div>
    </>
  );
}
