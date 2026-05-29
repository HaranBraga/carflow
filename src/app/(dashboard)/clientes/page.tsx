"use client";
import { useEffect, useState } from "react";
import { Users, Search, Star, TrendingUp, Car, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPhone, GENDER_LABELS, VEHICLE_CATEGORY_LABELS } from "@/lib/utils";

type Customer = {
  id: string;
  name: string;
  phone: string;
  gender: string;
  isUber: boolean;
  notes: string | null;
  createdAt: string;
  vehicles: any[];
  _count?: { feedbacks: number };
};

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("clientes");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", gender: "", isUber: false, notes: "" });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  async function fetchCustomers(q = "") {
    setLoading(true);
    const res = await fetch(`/api/clientes?search=${q}&limit=50`);
    const data = await res.json();
    setCustomers(data.customers || []);
    setLoading(false);
  }

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  function openEdit(c: Customer) {
    setEditing(c);
    setEditForm({ name: c.name, phone: c.phone, gender: c.gender, isUber: c.isUber, notes: c.notes ?? "" });
    setEditError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditSaving(true);
    setEditError("");
    const res = await fetch(`/api/clientes/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json().catch(() => ({}));
    setEditSaving(false);
    if (!res.ok) {
      setEditError(data.error || "Erro ao salvar");
      return;
    }
    setEditing(null);
    fetchCustomers(search);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">CRM / Clientes</h1>
        <Badge variant="secondary">{customers.length} clientes</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="ranking">Rankings</TabsTrigger>
          <TabsTrigger value="genero">Por Gênero</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="space-y-4 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {customers.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{c.name}</p>
                          {c.isUber && <Badge variant="info" className="text-xs">Uber</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatPhone(c.phone)}</p>
                        <p className="text-xs text-muted-foreground">{GENDER_LABELS[c.gender]}</p>
                        {c.vehicles?.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {c.vehicles.map((v: any) => (
                              <Badge key={v.id} variant="outline" className="font-mono text-xs">
                                {v.plate} · {VEHICLE_CATEGORY_LABELS[v.category]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar cliente">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {customers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ranking" className="mt-4"><CRMRanking /></TabsContent>
        <TabsContent value="genero" className="mt-4"><CRMGender /></TabsContent>
      </Tabs>

      {/* Modal de edição */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} type="tel" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gênero</Label>
                <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_INFORMED">Não informado</SelectItem>
                    <SelectItem value="MALE">Masculino</SelectItem>
                    <SelectItem value="FEMALE">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>É Uber?</Label>
                <Select value={editForm.isUber ? "sim" : "nao"} onValueChange={(v) => setEditForm({ ...editForm, isUber: v === "sim" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Anotações sobre o cliente" />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(null)} disabled={editSaving}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={editSaving}>{editSaving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CRMRanking() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/crm/ranking").then((r) => r.json()).then(setData); }, []);
  if (!data) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Top Clientes do Mês</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topCustomers?.map((c: any, i: number) => (
              <div key={c.customerId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-gray-300 text-gray-700" : "bg-orange-300 text-orange-900"}`}>{i + 1}</span>
                  <span className="truncate max-w-[120px]">{c.name}</span>
                </div>
                <span className="font-medium text-xs">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Ranking Serviços</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topServices?.map((s: any) => (
              <div key={s.serviceName} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[140px]">{s.serviceName}</span>
                <div className="text-right">
                  <p className="text-xs font-medium">{s.count}x</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(s.revenue)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Car className="w-4 h-4 text-green-500" />Por Categoria</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.byCategory?.map((c: any) => (
              <div key={c.category} className="flex items-center justify-between text-sm">
                <span className="truncate max-w-[120px] text-xs">{VEHICLE_CATEGORY_LABELS[c.category] || c.category}</span>
                <span className="font-medium text-xs">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {data.ticketMedio && (
        <Card>
          <CardContent className="p-4 flex items-center gap-6">
            <div><p className="text-xs text-muted-foreground">Ticket Médio</p><p className="text-2xl font-bold">{formatCurrency(data.ticketMedio)}</p></div>
            <div><p className="text-xs text-muted-foreground">Clientes Inativos (+30 dias)</p><p className="text-2xl font-bold text-orange-500">{data.inactiveCount}</p></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CRMGender() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch("/api/crm/genero").then((r) => r.json()).then(setData); }, []);
  if (!data) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  const total = data.reduce((sum: number, g: any) => sum + g.count, 0);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {data.map((g: any) => (
        <Card key={g.gender}>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{g.count}</p>
            <p className="text-sm text-muted-foreground">{GENDER_LABELS[g.gender]}</p>
            <p className="text-xs text-primary font-medium mt-1">{total > 0 ? Math.round((g.count / total) * 100) : 0}%</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
