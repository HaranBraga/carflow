"use client";
import { useEffect, useState } from "react";
import { Wrench, Plus, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function ServicosPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", basePrice: "" });

  async function fetchServices() {
    const res = await fetch("/api/servicos");
    setServices(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchServices(); }, []);

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/servicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, basePrice: parseFloat(form.basePrice) }),
    });
    setDialogOpen(false);
    setForm({ name: "", description: "", basePrice: "" });
    fetchServices();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Serviços</h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" />Novo Serviço</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Serviço</DialogTitle></DialogHeader>
            <form onSubmit={createService} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Lavagem Simples" required />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do serviço" />
              </div>
              <div>
                <Label>Preço base (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} placeholder="0,00" required />
              </div>
              <Button type="submit" className="w-full">Criar Serviço</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold">{s.name}</p>
                    {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                  </div>
                  <Badge variant="success" className="shrink-0 ml-2">{formatCurrency(Number(s.basePrice))}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum serviço cadastrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
