"use client";
import { useEffect, useState } from "react";
import { Users, Search, Star, TrendingUp, Car, Pencil, Lightbulb, Phone, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatPhone, GENDER_LABELS, VEHICLE_CATEGORY_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/utils";

function lastVisitDate(customer: any): Date | null {
  const dates = customer.vehicles?.flatMap((v: any) => v.orders?.map((o: any) => new Date(o.arrivedAt)) ?? []) ?? [];
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((d: Date) => d.getTime())));
}

function haQuantosDias(date: Date | null): string | null {
  if (!date) return null;
  return formatDistanceToNow(date, { locale: ptBR, addSuffix: true });
}

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
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);

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
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
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
                        {(() => {
                          const ultimo = haQuantosDias(lastVisitDate(c));
                          return ultimo ? (
                            <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" /> Última visita {ultimo}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-0.5">Sem visitas registradas</p>
                          );
                        })()}
                        {c.vehicles?.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {c.vehicles.map((v: any) => (
                              <Badge key={v.id} variant="outline" className="font-mono text-xs">
                                {v.plate} · {VEHICLE_CATEGORY_LABELS[v.category] || v.category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setHistoryCustomer(c)} title="Histórico">
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
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

        <TabsContent value="oportunidades" className="mt-4"><CRMOportunidades /></TabsContent>
        <TabsContent value="ranking" className="mt-4"><CRMRanking /></TabsContent>
        <TabsContent value="genero" className="mt-4"><CRMGender /></TabsContent>
      </Tabs>

      {/* Modal de histórico */}
      <Dialog open={!!historyCustomer} onOpenChange={(o) => { if (!o) setHistoryCustomer(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Histórico — {historyCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {historyCustomer && <CustomerHistory customerId={historyCustomer.id} />}
        </DialogContent>
      </Dialog>

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

function CRMOportunidades() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "realized">("pending");
  const [loading, setLoading] = useState(true);

  async function load(f = filter) {
    setLoading(true);
    const url = f === "pending" ? "/api/oportunidades?contacted=false" : "/api/oportunidades?contacted=true";
    const res = await fetch(url);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { load(filter); }, [filter]);

  const grouped = items.reduce((acc: Record<string, any[]>, op) => {
    const key = op.order.vehicle.customer.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(op);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <p className="font-semibold">Oportunidades</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
            Pendentes
          </Button>
          <Button size="sm" variant={filter === "realized" ? "default" : "outline"} onClick={() => setFilter("realized")}>
            Realizadas
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{filter === "pending" ? "Nenhuma oportunidade pendente." : "Nenhuma oportunidade realizada ainda."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.values(grouped).map((ops) => {
            const customer = ops[0].order.vehicle.customer;
            const plate = ops[0].order.vehicle.plate;
            return (
              <Card key={customer.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{customer.name}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        <a href={`tel:${customer.phone}`} className="hover:underline">{formatPhone(customer.phone)}</a>
                        <span className="font-mono text-xs">· {plate}</span>
                      </p>
                      {(() => {
                        const lastDate = ops.reduce((max: Date | null, op: any) => {
                          const d = new Date(op.order.arrivedAt);
                          return !max || d > max ? d : max;
                        }, null);
                        const texto = haQuantosDias(lastDate);
                        return texto ? (
                          <p className="text-xs text-orange-600 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Última visita {texto}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {ops.map((op) => (
                      <div key={op.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${op.contacted ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{op.description}</p>
                          {op.estimatedValue && (
                            <p className="text-xs text-muted-foreground">{formatCurrency(Number(op.estimatedValue))}</p>
                          )}
                        </div>
                        {op.contacted && (
                          <div className="shrink-0 ml-2 flex items-center gap-1 text-xs text-green-700 font-medium">
                            <CheckCircle className="w-3 h-3" /> Realizado
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomerHistory({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ordens?customerId=${customerId}&limit=30`)
      .then((r) => r.json())
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setLoading(false); });
  }, [customerId]);

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>;
  if (orders.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p>Nenhuma ordem encontrada.</p>
    </div>
  );

  return (
    <div className="space-y-3 mt-2">
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-mono font-bold text-sm">{order.vehicle.plate}</span>
              <span className="text-xs text-muted-foreground ml-2">{VEHICLE_CATEGORY_LABELS[order.vehicle.category] || order.vehicle.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(order.arrivedAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
          {order.items?.length > 0 && (
            <div className="space-y-0.5">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{item.service?.name}</span>
                  <span>{formatCurrency(Number(item.unitPrice))}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold pt-1 border-t">
            <span>Total</span>
            <span>{formatCurrency(Number(order.totalAmount))}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
