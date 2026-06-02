"use client";
import { useEffect, useState } from "react";
import { Wrench, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, VEHICLE_CATEGORY_LABELS } from "@/lib/utils";

const VEHICLE_CATEGORIES = Object.keys(VEHICLE_CATEGORY_LABELS);

type CategoryPrice = { category: string; price: string; enabled: boolean };

type ServiceData = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  pricingType: string;
  isOpportunityOnly: boolean;
  active: boolean;
  prices: { id: string; category: string; price: number }[];
};

const emptyForm = {
  name: "",
  description: "",
  basePrice: "",
  pricingType: "FIXED" as "FIXED" | "PER_M2",
  isOpportunityOnly: false,
  prices: VEHICLE_CATEGORIES.map((c) => ({ category: c, price: "", enabled: false })) as CategoryPrice[],
  samePriceAll: true,
};

export default function ServicosPage() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function fetchServices() {
    const res = await fetch("/api/servicos");
    setServices(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchServices(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(svc: ServiceData) {
    const priceByCat: Record<string, number> = {};
    svc.prices.forEach((p) => { priceByCat[p.category] = Number(p.price); });
    setForm({
      name: svc.name,
      description: svc.description ?? "",
      basePrice: String(svc.basePrice),
      pricingType: (svc.pricingType as "FIXED" | "PER_M2") ?? "FIXED",
      isOpportunityOnly: svc.isOpportunityOnly ?? false,
      prices: VEHICLE_CATEGORIES.map((c) => ({
        category: c,
        price: priceByCat[c] !== undefined ? String(priceByCat[c]) : "",
        enabled: priceByCat[c] !== undefined,
      })),
      samePriceAll: svc.prices.length === 0,
    });
    setEditingId(svc.id);
    setError("");
    setDialogOpen(true);
  }

  function toggleCategory(cat: string) {
    setForm({
      ...form,
      prices: form.prices.map((p) =>
        p.category === cat ? { ...p, enabled: !p.enabled, price: !p.enabled && !p.price ? form.basePrice : p.price } : p
      ),
    });
  }

  function setCategoryPrice(cat: string, price: string) {
    setForm({ ...form, prices: form.prices.map((p) => p.category === cat ? { ...p, price } : p) });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const basePrice = parseFloat(form.basePrice);
    if (!basePrice && basePrice !== 0) {
      setError("Preço base inválido");
      setSubmitting(false);
      return;
    }

    const prices = form.samePriceAll
      ? []
      : form.prices
          .filter((p) => p.enabled && p.price !== "")
          .map((p) => ({ category: p.category, price: parseFloat(p.price) }));

    const payload = {
      name: form.name,
      description: form.description || undefined,
      basePrice,
      pricingType: form.pricingType,
      isOpportunityOnly: form.isOpportunityOnly,
      prices,
    };

    const res = editingId
      ? await fetch(`/api/servicos/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/servicos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao salvar");
      return;
    }

    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
    fetchServices();
  }

  async function deleteService(id: string, name: string) {
    if (!confirm(`Desativar serviço "${name}"?`)) return;
    await fetch(`/api/servicos/${id}`, { method: "DELETE" });
    fetchServices();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Serviços</h1>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Novo Serviço</Button>
      </div>

      <Tabs defaultValue="servicos">
        <TabsList>
          <TabsTrigger value="servicos">Serviços</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Veículo</TabsTrigger>
        </TabsList>

        <TabsContent value="servicos" className="mt-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : services.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum serviço cadastrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold">{s.name}</p>
                          {s.isOpportunityOnly && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">Só oportunidade</Badge>
                          )}
                          {s.prices.length === 0 ? (
                            <Badge variant="secondary">Preço único: {formatCurrency(Number(s.basePrice))}</Badge>
                          ) : (
                            <Badge variant="outline">{s.prices.length} tipo(s)</Badge>
                          )}
                        </div>
                        {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                        {s.prices.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {s.prices.map((p) => (
                              <Badge key={p.id} variant="outline" className="text-xs">
                                {VEHICLE_CATEGORY_LABELS[p.category]}: {formatCurrency(Number(p.price))}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteService(s.id, s.name)} title="Desativar" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <TiposDeVeiculo services={services} onRefresh={fetchServices} />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Serviço" : "Cadastrar Serviço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Lavagem Simples" required />
              </div>
              <div>
                <Label>Tipo de cobrança</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.pricingType}
                  onChange={(e) => setForm({ ...form, pricingType: e.target.value as "FIXED" | "PER_M2" })}
                >
                  <option value="FIXED">Preço fixo</option>
                  <option value="PER_M2">Por m² (tapete)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label>Preço base * {form.pricingType === "PER_M2" && <span className="text-muted-foreground text-xs">(por m²)</span>}</Label>
                <Input type="number" step="0.01" min="0" value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  placeholder="0,00" required />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do serviço" />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOpportunityOnly}
                onChange={(e) => setForm({ ...form, isOpportunityOnly: e.target.checked })}
              />
              <span className="text-sm font-medium">Apenas oportunidade</span>
            </label>

            <div className="border-t pt-4 space-y-3">
              <Label className="text-base">Preço por tipo de veículo</Label>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={form.samePriceAll} onChange={() => setForm({ ...form, samePriceAll: true })} />
                Mesmo preço para todos os tipos (usa o preço base)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!form.samePriceAll} onChange={() => setForm({ ...form, samePriceAll: false })} />
                Preço diferente por tipo (escolha abaixo)
              </label>

              {!form.samePriceAll && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Marque os tipos em que esse serviço se aplica. Tipos sem marcação não aparecerão no atendimento.
                  </p>
                  {form.prices.map((p) => (
                    <div key={p.category} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input type="checkbox" checked={p.enabled} onChange={() => toggleCategory(p.category)} />
                        <span className="text-sm">{VEHICLE_CATEGORY_LABELS[p.category]}</span>
                      </label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={p.price}
                        onChange={(e) => setCategoryPrice(p.category, e.target.value)}
                        placeholder="0,00"
                        disabled={!p.enabled}
                        className="w-32"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editingId ? "Salvar" : "Criar Serviço"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TiposDeVeiculo({ services, onRefresh }: { services: ServiceData[]; onRefresh: () => void }) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelValue, setLabelValue] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);
  const [editingPrice, setEditingPrice] = useState<{ serviceId: string; category: string } | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    fetch("/api/categorias-veiculo")
      .then((r) => r.json())
      .then((data: { category: string; label: string }[]) => {
        const map: Record<string, string> = {};
        data.forEach((d) => { map[d.category] = d.label; });
        setLabels(map);
      });
  }, []);

  function getLabel(cat: string) {
    return labels[cat] || VEHICLE_CATEGORY_LABELS[cat] || cat;
  }

  async function saveLabel(category: string) {
    setSavingLabel(true);
    await fetch("/api/categorias-veiculo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ category, label: labelValue }]),
    });
    setLabels((prev) => ({ ...prev, [category]: labelValue }));
    setEditingLabel(null);
    setSavingLabel(false);
  }

  async function savePrice() {
    if (!editingPrice) return;
    const { serviceId, category } = editingPrice;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;

    setSavingPrice(true);
    const newPrice = parseFloat(priceValue);

    let payload: any;
    if (svc.prices.length === 0) {
      payload = { basePrice: newPrice };
    } else {
      const existing = svc.prices.map((p) => ({ category: p.category, price: Number(p.price) }));
      const hasCat = existing.some((p) => p.category === category);
      payload = {
        prices: hasCat
          ? existing.map((p) => p.category === category ? { ...p, price: newPrice } : p)
          : [...existing, { category, price: newPrice }],
      };
    }

    await fetch(`/api/servicos/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setEditingPrice(null);
    setSavingPrice(false);
    onRefresh();
  }

  const servicesByCategory = VEHICLE_CATEGORIES.map((cat) => ({
    category: cat,
    services: services.filter((s) => s.prices.length === 0 || s.prices.some((p) => p.category === cat)),
  }));

  return (
    <div className="space-y-4">
      {/* Edição de nomes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nomes exibidos</CardTitle>
          <p className="text-xs text-muted-foreground">Personalize o nome de cada tipo de veículo</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {VEHICLE_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-2">
              {editingLabel === cat ? (
                <>
                  <Input
                    className="flex-1 h-8"
                    value={labelValue}
                    onChange={(e) => setLabelValue(e.target.value)}
                  />
                  <Button size="sm" className="h-8 w-8 p-0" onClick={() => saveLabel(cat)} disabled={savingLabel}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingLabel(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{getLabel(cat)}</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => { setEditingLabel(cat); setLabelValue(getLabel(cat)); }}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Serviços por tipo com edição de preço */}
      <p className="text-sm font-medium text-muted-foreground">Serviços e preços por tipo</p>
      <div className="grid md:grid-cols-2 gap-3">
        {servicesByCategory.map(({ category, services: applicable }) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                {getLabel(category)}
                <Badge variant="secondary" className="ml-auto">{applicable.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applicable.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum serviço aplicável</p>
              ) : (
                <ul className="space-y-2">
                  {applicable.map((svc) => {
                    const catPrice = svc.prices.find((p) => p.category === category);
                    const price = catPrice ? Number(catPrice.price) : Number(svc.basePrice);
                    const isEditing = editingPrice?.serviceId === svc.id && editingPrice?.category === category;

                    return (
                      <li key={svc.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{svc.name}{svc.pricingType === "PER_M2" ? " (m²)" : ""}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number" step="0.01" min="0"
                              value={priceValue}
                              onChange={(e) => setPriceValue(e.target.value)}
                              className="w-24 h-7 text-xs"
                            />
                            <Button size="sm" className="h-7 w-7 p-0" onClick={savePrice} disabled={savingPrice}>
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingPrice(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-medium text-xs">{formatCurrency(price)}</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                              onClick={() => { setEditingPrice({ serviceId: svc.id, category }); setPriceValue(String(price)); }}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
