"use client";
import { useEffect, useState } from "react";
import { Star, QrCode, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPhone } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<any>(null);

  useEffect(() => {
    fetch("/api/feedback").then((r) => r.json()).then((data) => { setFeedbacks(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (search.length < 2) { setCustomers([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clientes?search=${search}&limit=10`);
      const data = await res.json();
      setCustomers(data.customers || []);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function generateFeedback(customerId: string, customerName: string) {
    setGenerating(customerId);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId }),
    });
    const data = await res.json();
    setGenerating(null);
    setQrModal({ ...data, customerName });
    setSearch("");
    setCustomers([]);
    const updated = await fetch("/api/feedback").then((r) => r.json());
    setFeedbacks(updated);
  }

  function printFeedback() {
    window.print();
  }

  const avgRating = feedbacks.filter((f) => f.rating !== null).reduce((sum, f) => sum + f.rating, 0) /
    (feedbacks.filter((f) => f.rating !== null).length || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Star className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Feedback & Avaliações</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{feedbacks.length}</p>
            <p className="text-xs text-muted-foreground">QR Codes gerados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{feedbacks.filter((f) => f.submittedAt).length}</p>
            <p className="text-xs text-muted-foreground">Avaliações recebidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{avgRating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Nota média</p>
          </CardContent>
        </Card>
      </div>

      {/* Gerar QR */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" />Gerar QR Code de Feedback</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {customers.length > 0 && (
            <div className="border rounded-lg divide-y">
              {customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPhone(c.phone)}</p>
                  </div>
                  <Button size="sm" onClick={() => generateFeedback(c.id, c.name)} disabled={generating === c.id}>
                    {generating === c.id ? "Gerando..." : "Gerar QR"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="p-6 text-center space-y-4">
              <p className="font-bold text-lg">QR Code gerado!</p>
              <p className="text-sm text-muted-foreground">{qrModal.customerName}</p>
              <img src={qrModal.qrCodeDataUrl} alt="QR Code" className="mx-auto w-48 h-48" />
              <p className="text-xs text-muted-foreground break-all">{qrModal.feedbackUrl}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setQrModal(null)}>Fechar</Button>
                <Button className="flex-1 gap-2" onClick={() => { setQrModal(null); }}>
                  <Printer className="w-4 h-4" />Imprimir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de feedbacks */}
      <Card>
        <CardHeader><CardTitle className="text-base">Avaliações Recebidas</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : feedbacks.filter((f) => f.submittedAt).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma avaliação recebida ainda</p>
          ) : (
            <div className="space-y-3">
              {feedbacks.filter((f) => f.submittedAt).map((f) => (
                <div key={f.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{f.customer?.name}</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`w-4 h-4 ${star <= f.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">{f.rating}/5</span>
                    </div>
                  </div>
                  {f.comment && <p className="text-sm text-muted-foreground italic">"{f.comment}"</p>}
                  <p className="text-xs text-muted-foreground">{format(new Date(f.submittedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
