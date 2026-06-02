"use client";
import { useEffect, useState } from "react";
import { UserCheck, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatPhone } from "@/lib/utils";

type Washer = { id: string; name: string; phone: string | null; cpf: string | null; active: boolean; _count?: { orders: number } };
const emptyForm = { name: "", phone: "", cpf: "" };

export default function LavadoresPage() {
  const [washers, setWashers] = useState<Washer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function fetchWashers() {
    const res = await fetch("/api/lavadores");
    setWashers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchWashers(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialog(true);
  }

  function openEdit(w: Washer) {
    setForm({ name: w.name, phone: w.phone ?? "", cpf: w.cpf ?? "" });
    setEditingId(w.id);
    setDialog(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      await fetch(`/api/lavadores/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/lavadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setSaving(false);
    setDialog(false);
    setForm(emptyForm);
    setEditingId(null);
    fetchWashers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Lavadores Autônomos</h1>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Novo Lavador</Button>
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
                    {washer.cpf && <p className="text-xs text-muted-foreground">CPF: {washer.cpf}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Ativo</Badge>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(washer)} title="Editar">
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{washer._count?.orders || 0} serviços realizados</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={(o) => { if (!o) { setDialog(false); setEditingId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Lavador" : "Novo Lavador"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" required />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-0000" />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialog(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
