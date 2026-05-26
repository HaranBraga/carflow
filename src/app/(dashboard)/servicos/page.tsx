"use client";
import { useEffect, useState } from "react";
import { Wrench, Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  active: boolean;
  prices: { id: string; category: string; price: number }[];
};

const emptyForm = {
  name: "",
  description: "",
  basePrice: "",
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
    setForm({
      ...form,
      prices: form.prices.map((p) => p.category === cat ? { ...p, price } : p),
    });
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

  const servicesByCategory = VEHICLE_CATEGORIES.map((cat) => {
    const applicable = services.filter((s) =>
      s.prices.length === 0 || s.prices.some((p) => p.category === cat)
    );
    return { category: cat, services: applicable };
  });

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
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
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
                        <div className="flex items-center gap-2">
                          <p className="font-bold">{s.name}</p>
                          {s.prices.length === 0 ? (
                            <Badge variant="secondary">Preço único: {formatCurrency(Number(s.basePrice))}</Badge>
                          ) : (
                            <Badge variant="outline">{s.prices.length} categoria(s)</Badge>
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

        <TabsContent value="categorias" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Veja quais serviços se aplicam a cada categoria de veículo. Para editar os preços por categoria, abra a aba Serviços e clique em editar.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {servicesByCategory.map(({ category, services: applicable }) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {VEHICLE_CATEGORY_LABELS[category]}
                    <Badge variant="secondary" className="ml-auto">{applicable.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {applicable.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum serviço aplicável</p>
                  ) : (
                    <ul className="space-y-1">
                      {applicable.map((svc) => {
                        const catPrice = svc.prices.find((p) => p.category === category);
                        const price = catPrice ? Number(catPrice.price) : Number(svc.basePrice);
                        return (
                          <li key={svc.id} className="flex justify-between text-sm">
                            <span>{svc.name}</span>
                            <span className="font-medium">{formatCurrency(price)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
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
                <Label>Preço base *</Label>
                <Input type="number" step="0.01" min="0" value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  placeholder="0,00" required />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição do serviço" />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Preço por categoria de veículo</Label>
              </div>

              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.samePriceAll}
                    onChange={() => setForm({ ...form, samePriceAll: true })}
                  />
                  Mesmo preço para todas as categorias (usa o preço base)
                </label>
              </div>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!form.samePriceAll}
                    onChange={() => setForm({ ...form, samePriceAll: false })}
                  />
                  Preço diferente por categoria (escolha abaixo)
                </label>
              </div>

              {!form.samePriceAll && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-muted-foreground">
                    Marque as categorias em que esse serviço se aplica. Categorias sem marcação não aparecerão no atendimento.
                  </p>
                  {form.prices.map((p) => (
                    <div key={p.category} className="flex items-center gap-3">
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={p.enabled}
                          onChange={() => toggleCategory(p.category)}
                        />
                        <span className="text-sm">{VEHICLE_CATEGORY_LABELS[p.category]}</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
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
