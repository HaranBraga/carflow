"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, Plus, TrendingUp, TrendingDown, Minus, Tag,
  Pencil, Trash2, UserCheck, Check, Loader2, Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPhone, cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };
type Entry = {
  id: string; date: string; type: "INCOME" | "EXPENSE";
  category: string; description: string; amount: number; orderId?: string | null;
};
type WasherPaymentRecord = {
  id: string; amount: number; days: number; bonus: number; date: string; notes: string | null;
};
type Washer = {
  id: string; name: string; phone: string | null; cpf: string | null;
  active: boolean; dailyRate: number | null;
  _count: { orders: number; payments: number };
  payments: WasherPaymentRecord[];
};
type PaymentInput = { days: number; dailyRate: number; bonus: number };

const emptyWasherForm = { name: "", phone: "", cpf: "", dailyRate: "" };

export default function FinanceiroPage() {
  const [tab, setTab] = useState("lancamentos");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Lançamentos
  const [cashData, setCashData] = useState<{
    entries: Entry[]; totalIncome: number; totalExpense: number; balance: number;
  }>({ entries: [], totalIncome: 0, totalExpense: 0, balance: 0 });
  const [cashLoading, setCashLoading] = useState(true);

  // Categorias
  const [categories, setCategories] = useState<Category[]>([]);

  // Lavadores
  const [washers, setWashers] = useState<Washer[]>([]);
  const [washersLoaded, setWashersLoaded] = useState(false);
  const [washersLoading, setWashersLoading] = useState(false);

  // Pagar Diária — selected[washerId] = { days, dailyRate, bonus }
  const [selected, setSelected] = useState<Record<string, PaymentInput>>({});
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Dialogs: lançamento
  const [entryDialog, setEntryDialog] = useState(false);
  const [entryForm, setEntryForm] = useState({ type: "INCOME", categoryId: "", description: "", amount: "" });

  // Dialogs: categoria
  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", type: "INCOME" as "INCOME" | "EXPENSE" });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Dialogs: lavador
  const [washerDialog, setWasherDialog] = useState(false);
  const [washerForm, setWasherForm] = useState(emptyWasherForm);
  const [editingWasherId, setEditingWasherId] = useState<string | null>(null);
  const [washerSaving, setWasherSaving] = useState(false);

  // ── Data fetching ──

  const loadCash = useCallback(async (d = date) => {
    setCashLoading(true);
    const res = await fetch(`/api/caixa?date=${d}`);
    if (res.ok) setCashData(await res.json());
    setCashLoading(false);
  }, [date]);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/financeiro/categorias");
    if (res.ok) setCategories(await res.json());
  }, []);

  const loadWashers = useCallback(async () => {
    setWashersLoading(true);
    const res = await fetch("/api/lavadores");
    if (res.ok) {
      setWashers(await res.json());
      setWashersLoaded(true);
    }
    setWashersLoading(false);
  }, []);

  useEffect(() => { loadCash(); loadCategories(); }, []);
  useEffect(() => { loadCash(date); }, [date]);
  useEffect(() => {
    if ((tab === "pagar-diaria" || tab === "lavadores") && !washersLoaded) {
      loadWashers();
    }
  }, [tab]);

  // ── Pagar Diária ──

  function toggleWasher(washer: Washer) {
    setPaySuccess(false);
    setSelected((prev) => {
      if (prev[washer.id]) {
        const next = { ...prev };
        delete next[washer.id];
        return next;
      }
      return {
        ...prev,
        [washer.id]: {
          days: 1,
          dailyRate: washer.dailyRate ? Number(washer.dailyRate) : 0,
          bonus: 0,
        },
      };
    });
  }

  function updatePayment(washerId: string, field: keyof PaymentInput, raw: string) {
    const value = parseFloat(raw) || 0;
    setSelected((prev) => ({
      ...prev,
      [washerId]: { ...prev[washerId], [field]: value },
    }));
  }

  async function paySelected() {
    const entries = Object.entries(selected);
    if (entries.length === 0) return;
    setPaying(true);
    setPaySuccess(false);
    try {
      const payments = entries.map(([washerId, p]) => ({
        washerId,
        days: p.days,
        dailyRate: p.dailyRate,
        bonus: p.bonus,
      }));
      const res = await fetch("/api/lavadores/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payments }),
      });
      if (res.ok) {
        setSelected({});
        setPaySuccess(true);
        await Promise.all([loadWashers(), loadCash(date)]);
      }
    } finally {
      setPaying(false);
    }
  }

  const totalToPay = Object.entries(selected).reduce((sum, [, p]) => {
    return sum + (p.days || 0) * (p.dailyRate || 0) + (p.bonus || 0);
  }, 0);

  const selectedCount = Object.keys(selected).length;

  // ── Lançamentos ──

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const cat = categories.find((c) => c.id === entryForm.categoryId);
    await fetch("/api/caixa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: entryForm.type,
        category: cat?.name || "Geral",
        description: entryForm.description,
        amount: parseFloat(entryForm.amount),
      }),
    });
    setEntryDialog(false);
    setEntryForm({ type: "INCOME", categoryId: "", description: "", amount: "" });
    loadCash(date);
  }

  // ── Categorias ──

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (editingCat) {
      await fetch(`/api/financeiro/categorias/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name }),
      });
    } else {
      await fetch("/api/financeiro/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catForm),
      });
    }
    setCatDialog(false);
    setCatForm({ name: "", type: "INCOME" });
    setEditingCat(null);
    loadCategories();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await fetch(`/api/financeiro/categorias/${id}`, { method: "DELETE" });
    loadCategories();
  }

  // ── Lavadores CRUD ──

  function openCreateWasher() {
    setWasherForm(emptyWasherForm);
    setEditingWasherId(null);
    setWasherDialog(true);
  }

  function openEditWasher(w: Washer) {
    setWasherForm({
      name: w.name,
      phone: w.phone ?? "",
      cpf: w.cpf ?? "",
      dailyRate: w.dailyRate ? String(Number(w.dailyRate)) : "",
    });
    setEditingWasherId(w.id);
    setWasherDialog(true);
  }

  async function saveWasher(e: React.FormEvent) {
    e.preventDefault();
    setWasherSaving(true);
    const body: Record<string, unknown> = {
      name: washerForm.name,
      phone: washerForm.phone || undefined,
      cpf: washerForm.cpf || undefined,
      dailyRate: washerForm.dailyRate ? parseFloat(washerForm.dailyRate) : undefined,
    };
    if (editingWasherId) {
      await fetch(`/api/lavadores/${editingWasherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/lavadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setWasherSaving(false);
    setWasherDialog(false);
    setWasherForm(emptyWasherForm);
    setEditingWasherId(null);
    loadWashers();
  }

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  // Payments registered today visible in Lançamentos
  const dailyPaymentsToday = cashData.entries.filter((e) => e.category === "Diária Lavador");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="pagar-diaria">Pagar Diária</TabsTrigger>
          <TabsTrigger value="lavadores">Lavadores</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        {/* ─── LANÇAMENTOS ─── */}
        <TabsContent value="lancamentos" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            <Button onClick={() => setEntryDialog(true)} className="gap-1">
              <Plus className="w-4 h-4" /> Novo Lançamento
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Receitas</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(cashData.totalIncome)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(cashData.totalExpense)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cashData.balance >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                  <Minus className={`w-5 h-5 ${cashData.balance >= 0 ? "text-blue-600" : "text-red-600"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-bold ${cashData.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(cashData.balance)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {cashLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : cashData.entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum lançamento para este dia.</p>
              ) : (
                <div className="divide-y">
                  {cashData.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${entry.type === "INCOME" ? "bg-green-500" : "bg-red-500"}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{entry.description}</p>
                            {entry.orderId && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">OS</Badge>
                            )}
                            {entry.category === "Diária Lavador" && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">Lavador</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.category} · {format(new Date(entry.date), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold text-sm ${entry.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                        {entry.type === "EXPENSE" ? "-" : "+"}{formatCurrency(Number(entry.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PAGAR DIÁRIA ─── */}
        <TabsContent value="pagar-diaria" className="mt-4 space-y-4">
          {/* Header: date + pay button */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data de referência</p>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            </div>
          </div>

          {/* Success message */}
          {paySuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
              Pagamentos registrados com sucesso!
            </div>
          )}

          {/* Washer list */}
          {washersLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando lavadores...</p>
          ) : !washersLoaded || washers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Nenhum lavador cadastrado</p>
                <Button className="mt-4" onClick={() => setTab("lavadores")}>Cadastrar Lavadores</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Selecione os lavadores para pagar
              </p>
              {washers.map((washer) => {
                const isSelected = !!selected[washer.id];
                const payment = selected[washer.id];
                const payTotal = payment
                  ? (payment.days || 0) * (payment.dailyRate || 0) + (payment.bonus || 0)
                  : 0;
                const lastPay = washer.payments[0];

                return (
                  <Card
                    key={washer.id}
                    className={cn(
                      "transition-all cursor-pointer select-none",
                      isSelected && "border-primary ring-1 ring-primary"
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Row: checkbox + info + total */}
                      <div className="flex items-center gap-3" onClick={() => toggleWasher(washer)}>
                        <div
                          className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{washer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Diária:{" "}
                            {washer.dailyRate
                              ? <span className="font-medium text-foreground">{formatCurrency(Number(washer.dailyRate))}</span>
                              : <span className="text-orange-500">não definida</span>}
                            {lastPay && (
                              <span>
                                {" "}· Último pag:{" "}
                                {format(new Date(lastPay.date), "dd/MM", { locale: ptBR })}
                              </span>
                            )}
                          </p>
                        </div>
                        {isSelected && (
                          <p className="font-bold text-red-600 text-sm shrink-0 ml-auto">
                            {formatCurrency(payTotal)}
                          </p>
                        )}
                      </div>

                      {/* Expanded inputs when selected */}
                      {isSelected && payment && (
                        <div
                          className="mt-3 pt-3 border-t"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Dias</Label>
                              <Input
                                type="number"
                                step="0.5"
                                min="0.5"
                                max="31"
                                value={payment.days || ""}
                                onChange={(e) => updatePayment(washer.id, "days", e.target.value)}
                                className="mt-1 h-9 text-sm"
                                inputMode="decimal"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Valor/dia (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payment.dailyRate || ""}
                                onChange={(e) => updatePayment(washer.id, "dailyRate", e.target.value)}
                                className="mt-1 h-9 text-sm"
                                inputMode="decimal"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Bônus (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={payment.bonus || ""}
                                onChange={(e) => updatePayment(washer.id, "bonus", e.target.value)}
                                className="mt-1 h-9 text-sm"
                                inputMode="decimal"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {payment.days}d × {formatCurrency(payment.dailyRate)}
                            {payment.bonus > 0 && ` + bônus ${formatCurrency(payment.bonus)}`}
                            {" = "}
                            <span className="font-semibold text-foreground">{formatCurrency(payTotal)}</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Sticky pay bar */}
          {selectedCount > 0 && (
            <div className="sticky bottom-0 bg-background border-t py-3 px-0 flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{selectedCount} lavador{selectedCount > 1 ? "es" : ""} selecionado{selectedCount > 1 ? "s" : ""}</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalToPay)}</p>
              </div>
              <Button
                onClick={paySelected}
                disabled={paying || totalToPay <= 0}
                className="ml-auto gap-2"
                size="lg"
              >
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Confirmar Pagamento
              </Button>
            </div>
          )}

          {/* Payments today */}
          {dailyPaymentsToday.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                Pagamentos do dia
              </p>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {dailyPaymentsToday.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.date), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <span className="font-semibold text-sm text-red-600">
                          -{formatCurrency(Number(entry.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── LAVADORES ─── */}
        <TabsContent value="lavadores" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Cadastre os lavadores e defina a diária padrão de cada um.
            </p>
            <Button onClick={openCreateWasher} className="gap-1">
              <Plus className="w-4 h-4" /> Novo Lavador
            </Button>
          </div>

          {washersLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : !washersLoaded || washers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">Nenhum lavador cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {washers.map((washer) => {
                const lastPay = washer.payments[0];
                return (
                  <Card key={washer.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{washer.name}</p>
                          {washer.phone && (
                            <p className="text-sm text-muted-foreground">{formatPhone(washer.phone)}</p>
                          )}
                          {washer.cpf && (
                            <p className="text-xs text-muted-foreground">CPF: {washer.cpf}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Badge variant="success">Ativo</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditWasher(washer)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm border-t pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Diária padrão</p>
                          <p className={`font-semibold ${washer.dailyRate ? "text-foreground" : "text-muted-foreground"}`}>
                            {washer.dailyRate ? formatCurrency(Number(washer.dailyRate)) : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Serviços</p>
                          <p className="font-semibold">{washer._count.orders}</p>
                        </div>
                        {lastPay && (
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Último pag.</p>
                            <p className="font-semibold text-xs">
                              {format(new Date(lastPay.date), "dd/MM/yy", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── CATEGORIAS ─── */}
        <TabsContent value="categorias" className="mt-4 space-y-4">
          <Button
            onClick={() => { setCatForm({ name: "", type: "INCOME" }); setEditingCat(null); setCatDialog(true); }}
            className="gap-1"
          >
            <Plus className="w-4 h-4" /> Nova Categoria
          </Button>

          {(["INCOME", "EXPENSE"] as const).map((type) => {
            const cats = type === "INCOME" ? incomeCategories : expenseCategories;
            return (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {type === "INCOME" ? "Receitas" : "Despesas"}
                    <Badge variant="secondary">{cats.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {cats.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma categoria ainda.</p>
                  )}
                  {cats.map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <span className="text-sm">{c.name}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setEditingCat(c); setCatForm({ name: c.name, type: c.type }); setCatDialog(true); }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => deleteCategory(c.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* ─── Dialog: Novo Lançamento ─── */}
      <Dialog open={entryDialog} onOpenChange={setEntryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <form onSubmit={addEntry} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={entryForm.type} onValueChange={(v) => setEntryForm({ ...entryForm, type: v, categoryId: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={entryForm.categoryId} onValueChange={(v) => setEntryForm({ ...entryForm, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.type === entryForm.type).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number" step="0.01" min="0.01"
                value={entryForm.amount}
                onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEntryDialog(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1">Lançar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Categoria ─── */}
      <Dialog open={catDialog} onOpenChange={(o) => { if (!o) { setCatDialog(false); setEditingCat(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveCategory} className="space-y-3">
            {!editingCat && (
              <div>
                <Label>Tipo</Label>
                <Select value={catForm.type} onValueChange={(v: "INCOME" | "EXPENSE") => setCatForm({ ...catForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Receita</SelectItem>
                    <SelectItem value="EXPENSE">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Nome *</Label>
              <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCatDialog(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Lavador ─── */}
      <Dialog open={washerDialog} onOpenChange={(o) => { if (!o) { setWasherDialog(false); setEditingWasherId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingWasherId ? "Editar Lavador" : "Novo Lavador"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveWasher} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={washerForm.name}
                onChange={(e) => setWasherForm({ ...washerForm, name: e.target.value })}
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <Label>Diária Padrão (R$)</Label>
              <Input
                type="number" step="0.01" min="0"
                value={washerForm.dailyRate}
                onChange={(e) => setWasherForm({ ...washerForm, dailyRate: e.target.value })}
                placeholder="Ex: 100,00"
                inputMode="decimal"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Valor pré-preenchido ao pagar diária
              </p>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={washerForm.phone}
                onChange={(e) => setWasherForm({ ...washerForm, phone: e.target.value })}
                placeholder="(11) 99999-0000"
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={washerForm.cpf}
                onChange={(e) => setWasherForm({ ...washerForm, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setWasherDialog(false)} disabled={washerSaving}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={washerSaving}>
                {washerSaving ? "Salvando..." : editingWasherId ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
