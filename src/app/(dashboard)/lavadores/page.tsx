"use client";
import { useEffect, useState } from "react";
import { UserCheck, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPhone } from "@/lib/utils";

export default function LavadoresPage() {
  const [washers, setWashers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWasher, setNewWasher] = useState({ name: "", phone: "", cpf: "" });
  const [washerDialog, setWasherDialog] = useState(false);
  const [payDialog, setPayDialog] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");

  async function fetchWashers() {
    const res = await fetch("/api/lavadores");
    setWashers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchWashers(); }, []);

  async function createWasher(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/lavadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWasher),
    });
    setWasherDialog(false);
    setNewWasher({ name: "", phone: "", cpf: "" });
    fetchWashers();
  }

  async function payWasher(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/lavadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", washerId: payDialog, amount: parseFloat(payAmount), notes: payNotes }),
    });
    setPayDialog(null);
    setPayAmount("");
    setPayNotes("");
    fetchWashers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Lavadores Autônomos</h1>
        </div>
        <Dialog open={washerDialog} onOpenChange={setWasherDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" />Novo Lavador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Lavador</DialogTitle></DialogHeader>
            <form onSubmit={createWasher} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={newWasher.name} onChange={(e) => setNewWasher({ ...newWasher, name: e.target.value })} placeholder="Nome completo" required />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={newWasher.phone} onChange={(e) => setNewWasher({ ...newWasher, phone: e.target.value })} placeholder="(11) 99999-0000" />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={newWasher.cpf} onChange={(e) => setNewWasher({ ...newWasher, cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>
              <Button type="submit" className="w-full">Cadastrar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : washers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Nenhum lavador cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {washers.map((washer) => (
            <Card key={washer.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{washer.name}</p>
                    {washer.phone && <p className="text-sm text-muted-foreground">{formatPhone(washer.phone)}</p>}
                  </div>
                  <Badge variant="success">Ativo</Badge>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{washer._count?.orders || 0} serviços</span>
                  <span>·</span>
                  <span>{washer._count?.payments || 0} pagamentos</span>
                </div>

                <Dialog open={payDialog === washer.id} onOpenChange={(open) => setPayDialog(open ? washer.id : null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <DollarSign className="w-4 h-4" /> Pagar Diária
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Pagamento — {washer.name}</DialogTitle></DialogHeader>
                    <form onSubmit={payWasher} className="space-y-4">
                      <p className="text-sm text-muted-foreground">O valor será lançado como despesa no caixa do dia.</p>
                      <div>
                        <Label>Valor (R$) *</Label>
                        <Input type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0,00" required />
                      </div>
                      <div>
                        <Label>Observações</Label>
                        <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Ex: Diária do dia..." />
                      </div>
                      <Button type="submit" className="w-full">Confirmar Pagamento</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
