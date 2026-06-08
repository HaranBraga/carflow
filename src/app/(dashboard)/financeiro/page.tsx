"use client";
import { useEffect, useState, useCallback } from "react";
import {
  DollarSign, Plus, TrendingUp, TrendingDown, Minus, Tag,
  Pencil, Trash2, UserCheck, Check, Loader2, Banknote,
  CalendarDays, CalendarRange, Package, ReceiptText, Clock,
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

type ExpenseType = "MENSAL" | "DIARIA" | "INSUMOS";
type Category = {
  id: string; name: string; type: "INCOME" | "EXPENSE"; expenseType: ExpenseType | null;
};
type Entry = {
  id: string; date: string; type: "INCOME" | "EXPENSE";
  category: string; description: string; amount: number;
  orderId?: string | null; expenseType?: ExpenseType | null;
};
type CashData = {
  entries: Entry[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  expenseBreakdown: Record<string, number>;
  period: string;
  dateStr: string;
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

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  MENSAL: "Mensal",
  DIARIA: "Diária",
  INSUMOS: "Insumos",
};
const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  MENSAL: "bg-purple-50 text-purple-700 border-purple-200",
  DIARIA: "bg-orange-50 text-orange-700 border-orange-200",
  INSUMOS: "bg-teal-50 text-teal-700 border-teal-200",
};
const EXPENSE_TYPE_CARD: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  MENSAL: { label: "Mensal", icon: CalendarRange, color: "text-purple-600", bg: "bg-purple-50" },
  DIARIA: { label: "Diária", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
  INSUMOS: { label: "Insumos", icon: Package, color: "text-teal-600", bg: "bg-teal-50" },
  OUTRO: { label: "Outros", icon: ReceiptText, color: "text-gray-600", bg: "bg-gray-50" },
};

const emptyWasherForm = { name: "", phone: "", cpf: "", dailyRate: "" };

export default function FinanceiroPage() {
  const [tab, setTab] = useState("lancamentos");

  // Period state
  const [period, setPeriod] = useState<"day" | "month">("day");
  const [dayDate, setDayDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthDate, setMonthDate] = useState(new Date().toISOString().slice(0, 7));

  // Lançamentos
  const [cashData, setCashData] = useState<CashData>({
    entries: [], totalIncome: 0, totalExpense: 0, balance: 0,
    expenseBreakdown: { MENSAL: 0, DIARIA: 0, INSUMOS: 0, OUTRO: 0 },
    period: "day", dateStr: "",
  });
  const [cashLoading, setCashLoading] = useState(true);

  // Categorias
  const [categories, setCategories] = useState<Category[]>([]);

  // Lavadores
  const [washers, setWashers] = useState<Washer[]>([]);
  const [washersLoaded, setWashersLoaded] = useState(false);
  const [washersLoading, setWashersLoading] = useState(false);

  // Pagar Diária
  const [selected, setSelected] = useState<Record<string, PaymentInput>>({});
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Dialog: novo lançamento
  const [entryDialog, setEntryDialog] = useState(false);
  const [entryForm, setEntryForm] = useState({
    type: "INCOME" as "INCOME" | "EXPENSE",
    categoryId: "",
    description: "",
    amount: "",
    expenseType: "" as ExpenseType | "",
  });

  // Dialog: editar lançamento
  const [editDialog, setEditDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    expenseType: "" as ExpenseType | "",
  });

  // Dialog: categoria
  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState({
    name: "",
    type: "INCOME" as "INCOME" | "EXPENSE",
    expenseType: "" as ExpenseType | "",
  });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Dialog: lavador
  const [washerDialog, setWasherDialog] = useState(false);
  const [washerForm, setWasherForm] = useState(emptyWasherForm);
  const [editingWasherId, setEditingWasherId] = useState<string | null>(null);
  const [washerSaving, setWasherSaving] = useState(false);

  // ── Data fetching ──

  const effectiveDateStr = period === "month" ? monthDate : dayDate;

  const loadCash = useCallback(async (p = period, d = effectiveDateStr) => {
    setCashLoading(true);
    const res = await fetch(`/api/caixa?period=${p}&date=${d}`);
    if (res.ok) setCashData(await res.json());
    setCashLoading(false);
  }, [period, effectiveDateStr]);

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
  useEffect(() => { loadCash(period, effectiveDateStr); }, [period, dayDate, monthDate]);
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
        [washer.id]: { days: 1, dailyRate: washer.dailyRate ? Number(washer.dailyRate) : 0, bonus: 0 },
      };
    });
  }

  function updatePayment(washerId: string, field: keyof PaymentInput, raw: string) {
    setSelected((prev) => ({
      ...prev,
      [washerId]: { ...prev[washerId], [field]: parseFloat(raw) || 0 },
    }));
  }

  async function paySelected() {
    const entries = Object.entries(selected);
    if (entries.length === 0) return;
    setPaying(true);
    setPaySuccess(false);
    try {
      const res = await fetch("/api/lavadores/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payments: entries.map(([washerId, p]) => ({
            washerId, days: p.days, dailyRate: p.dailyRate, bonus: p.bonus,
          })),
        }),
      });
      if (res.ok) {
        setSelected({});
        setPaySuccess(true);
        await Promise.all([loadWashers(), loadCash()]);
      }
    } finally {
      setPaying(false);
    }
  }

  const totalToPay = Object.values(selected).reduce(
    (sum, p) => sum + (p.days || 0) * (p.dailyRate || 0) + (p.bonus || 0),
    0
  );
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
        categoryId: entryForm.categoryId || undefined,
        description: entryForm.description,
        amount: parseFloat(entryForm.amount),
        expenseType: entryForm.expenseType || undefined,
      }),
    });
    setEntryDialog(false);
    setEntryForm({ type: "INCOME", categoryId: "", description: "", amount: "", expenseType: "" });
    loadCash();
  }

  // ── Editar / Excluir lançamento ──

  function openEditEntry(entry: Entry) {
    const matchedCat = categories.find((c) => c.name === entry.category);
    setEditingEntry(entry);
    setEditForm({
      categoryId: matchedCat?.id ?? "",
      description: entry.description ?? "",
      amount: String(Number(entry.amount)),
      expenseType: (entry.expenseType as ExpenseType) ?? "",
    });
    setEditDialog(true);
  }

  async function saveEditEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    const cat = categories.find((c) => c.id === editForm.categoryId);
    await fetch(`/api/caixa/${editingEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: cat?.name || editingEntry.category,
        categoryId: editForm.categoryId || null,
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        expenseType: editForm.expenseType || null,
      }),
    });
    setEditDialog(false);
    setEditingEntry(null);
    loadCash();
  }

  async function deleteEntry(entry: Entry) {
    if (!confirm(`Excluir "${entry.description || entry.category}" de ${formatCurrency(Number(entry.amount))}?`)) return;
    const res = await fetch(`/api/caixa/${entry.id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Não foi possível excluir este lançamento.");
      return;
    }
    loadCash();
  }

  // ── Categorias ──

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      name: catForm.name,
      type: catForm.type,
      expenseType: catForm.type === "EXPENSE" && catForm.expenseType ? catForm.expenseType : undefined,
    };
    if (editingCat) {
      await fetch(`/api/financeiro/categorias/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catForm.name, expenseType: body.expenseType ?? null }),
      });
    } else {
      await fetch("/api/financeiro/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setCatDialog(false);
    setCatForm({ name: "", type: "INCOME", expenseType: "" });
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
      name: w.name, phone: w.phone ?? "", cpf: w.cpf ?? "",
      dailyRate: w.dailyRate ? String(Number(w.dailyRate)) : "",
    });
    setEditingWasherId(w.id);
    setWasherDialog(true);
  }

  async function saveWasher(e: React.FormEvent) {
    e.preventDefault();
    setWasherSaving(true);
    const body = {
      name: washerForm.name,
      phone: washerForm.phone || undefined,
      cpf: washerForm.cpf || undefined,
      dailyRate: washerForm.dailyRate ? parseFloat(washerForm.dailyRate) : undefined,
    };
    if (editingWasherId) {
      await fetch(`/api/lavadores/${editingWasherId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/lavadores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setWasherSaving(false);
    setWasherDialog(false);
    setWasherForm(emptyWasherForm);
    setEditingWasherId(null);
    loadWashers();
  }

  // ── Computed ──

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const dailyPaymentsToday = cashData.entries.filter((e) => e.category === "Diária Lavador");
  const hasExpenseBreakdown = cashData.totalExpense > 0;

  // ── Entry type auto-fill from category ──
  function handleCategoryChange(catId: string) {
    const cat = categories.find((c) => c.id === catId);
    setEntryForm((prev) => ({
      ...prev,
      categoryId: catId,
      expenseType: (cat?.expenseType as ExpenseType) || prev.expenseType,
    }));
  }

  // ─────────────────────────────────────────────────────────────
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

          {/* Controls row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period toggle */}
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setPeriod("day")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors",
                  period === "day" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
                )}
              >
                <CalendarDays className="w-3.5 h-3.5" /> Dia
              </button>
              <button
                onClick={() => setPeriod("month")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l",
                  period === "month" ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
                )}
              >
                <CalendarRange className="w-3.5 h-3.5" /> Mês
              </button>
            </div>

            {period === "day" ? (
              <Input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                className="w-40"
              />
            ) : (
              <Input
                type="month"
                value={monthDate}
                onChange={(e) => setMonthDate(e.target.value)}
                className="w-36"
              />
            )}

            <Button onClick={() => setEntryDialog(true)} className="gap-1 ml-auto">
              <Plus className="w-4 h-4" /> Novo Lançamento
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Receitas</p>
                  <p className="text-base font-bold text-green-600 truncate">
                    {formatCurrency(cashData.totalIncome)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg shrink-0">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-base font-bold text-red-600 truncate">
                    {formatCurrency(cashData.totalExpense)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${cashData.balance >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                  <Minus className={`w-4 h-4 ${cashData.balance >= 0 ? "text-blue-600" : "text-red-600"}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-base font-bold truncate ${cashData.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(cashData.balance)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense breakdown by type */}
          {hasExpenseBreakdown && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
                Despesas por tipo
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["MENSAL", "DIARIA", "INSUMOS", "OUTRO"] as const).map((key) => {
                  const val = cashData.expenseBreakdown[key] ?? 0;
                  if (val === 0) return null;
                  const meta = EXPENSE_TYPE_CARD[key];
                  const Icon = meta.icon;
                  return (
                    <Card key={key} className="border">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className={`p-1.5 rounded-md ${meta.bg} shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">{meta.label}</p>
                          <p className={`text-sm font-bold ${meta.color} truncate`}>
                            {formatCurrency(val)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Entry list */}
          <Card>
            <CardContent className="p-0">
              {cashLoading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : cashData.entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum lançamento para {period === "month" ? "este mês" : "este dia"}.
                </p>
              ) : (
                <div className="divide-y">
                  {cashData.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${entry.type === "INCOME" ? "bg-green-500" : "bg-red-500"}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium truncate">{entry.description}</p>
                            {entry.orderId && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">OS</Badge>
                            )}
                            {entry.expenseType && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 ${EXPENSE_TYPE_COLORS[entry.expenseType]}`}>
                                {EXPENSE_TYPE_LABELS[entry.expenseType]}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.category} · {format(new Date(entry.date), period === "month" ? "dd/MM HH:mm" : "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-semibold text-sm ${entry.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                          {entry.type === "EXPENSE" ? "-" : "+"}{formatCurrency(Number(entry.amount))}
                        </span>
                        {!entry.orderId && (
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => openEditEntry(entry)}
                              className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry)}
                              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PAGAR DIÁRIA ─── */}
        <TabsContent value="pagar-diaria" className="mt-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data de referência</p>
              <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} className="w-44" />
            </div>
          </div>

          {paySuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
              Pagamentos registrados com sucesso!
            </div>
          )}

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
                const payTotal = payment ? (payment.days || 0) * (payment.dailyRate || 0) + (payment.bonus || 0) : 0;
                const lastPay = washer.payments[0];

                return (
                  <Card key={washer.id} className={cn("transition-all cursor-pointer", isSelected && "border-primary ring-1 ring-primary")}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3" onClick={() => toggleWasher(washer)}>
                        <div className={cn("w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{washer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Diária:{" "}
                            {washer.dailyRate
                              ? <span className="font-medium text-foreground">{formatCurrency(Number(washer.dailyRate))}</span>
                              : <span className="text-orange-500">não definida</span>}
                            {lastPay && ` · Último pag: ${format(new Date(lastPay.date), "dd/MM", { locale: ptBR })}`}
                          </p>
                        </div>
                        {isSelected && (
                          <p className="font-bold text-red-600 text-sm shrink-0 ml-auto">{formatCurrency(payTotal)}</p>
                        )}
                      </div>

                      {isSelected && payment && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <Label className="text-xs text-muted-foreground">Dias</Label>
                            <Input type="number" step="0.5" min="0.5" max="31" value={payment.days || ""}
                              onChange={(e) => updatePayment(washer.id, "days", e.target.value)}
                              className="mt-1 h-9 text-sm" inputMode="decimal" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Valor/dia (R$)</Label>
                            <Input type="number" step="0.01" min="0" value={payment.dailyRate || ""}
                              onChange={(e) => updatePayment(washer.id, "dailyRate", e.target.value)}
                              className="mt-1 h-9 text-sm" inputMode="decimal" />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Bônus (R$)</Label>
                            <Input type="number" step="0.01" min="0" value={payment.bonus || ""}
                              onChange={(e) => updatePayment(washer.id, "bonus", e.target.value)}
                              className="mt-1 h-9 text-sm" inputMode="decimal" placeholder="0,00" />
                          </div>
                          <p className="col-span-3 text-xs text-muted-foreground">
                            {payment.days}d × {formatCurrency(payment.dailyRate)}
                            {payment.bonus > 0 && ` + bônus ${formatCurrency(payment.bonus)}`}
                            {" = "}<span className="font-semibold text-foreground">{formatCurrency(payTotal)}</span>
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {selectedCount > 0 && (
            <div className="sticky bottom-0 bg-background border-t py-3 flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{selectedCount} lavador{selectedCount > 1 ? "es" : ""} selecionado{selectedCount > 1 ? "s" : ""}</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalToPay)}</p>
              </div>
              <Button onClick={paySelected} disabled={paying || totalToPay <= 0} className="ml-auto gap-2" size="lg">
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                Confirmar Pagamento
              </Button>
            </div>
          )}

          {dailyPaymentsToday.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">Pagamentos do dia</p>
              <Card><CardContent className="p-0">
                <div className="divide-y">
                  {dailyPaymentsToday.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(entry.date), "HH:mm", { locale: ptBR })}</p>
                      </div>
                      <span className="font-semibold text-sm text-red-600">-{formatCurrency(Number(entry.amount))}</span>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            </div>
          )}
        </TabsContent>

        {/* ─── LAVADORES ─── */}
        <TabsContent value="lavadores" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Cadastre os lavadores e defina a diária padrão.</p>
            <Button onClick={openCreateWasher} className="gap-1">
              <Plus className="w-4 h-4" /> Novo Lavador
            </Button>
          </div>

          {washersLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : !washersLoaded || washers.length === 0 ? (
            <Card><CardContent className="text-center py-12">
              <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Nenhum lavador cadastrado</p>
            </CardContent></Card>
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
                          {washer.phone && <p className="text-sm text-muted-foreground">{formatPhone(washer.phone)}</p>}
                          {washer.cpf && <p className="text-xs text-muted-foreground">CPF: {washer.cpf}</p>}
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Badge variant="success">Ativo</Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditWasher(washer)}>
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
                            <p className="font-semibold text-xs">{format(new Date(lastPay.date), "dd/MM/yy", { locale: ptBR })}</p>
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
          <Button onClick={() => { setCatForm({ name: "", type: "INCOME", expenseType: "" }); setEditingCat(null); setCatDialog(true); }} className="gap-1">
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
                  {cats.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria ainda.</p>}
                  {cats.map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{c.name}</span>
                        {c.expenseType && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${EXPENSE_TYPE_COLORS[c.expenseType]}`}>
                            {EXPENSE_TYPE_LABELS[c.expenseType]}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingCat(c);
                            setCatForm({ name: c.name, type: c.type, expenseType: c.expenseType ?? "" });
                            setCatDialog(true);
                          }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteCategory(c.id)}>
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
              <Select value={entryForm.type} onValueChange={(v: "INCOME" | "EXPENSE") =>
                setEntryForm({ ...entryForm, type: v, categoryId: "", expenseType: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {entryForm.type === "EXPENSE" && (
              <div>
                <Label>Tipo de despesa</Label>
                <Select value={entryForm.expenseType} onValueChange={(v) =>
                  setEntryForm({ ...entryForm, expenseType: v as ExpenseType })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="DIARIA">Diária</SelectItem>
                    <SelectItem value="INSUMOS">Insumos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Categoria</Label>
              <Select value={entryForm.categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.type === entryForm.type).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{c.expenseType ? ` (${EXPENSE_TYPE_LABELS[c.expenseType]})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input value={entryForm.description} placeholder="Opcional"
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0.01" value={entryForm.amount}
                onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })} required />
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
                <Select value={catForm.type} onValueChange={(v: "INCOME" | "EXPENSE") =>
                  setCatForm({ ...catForm, type: v, expenseType: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Receita</SelectItem>
                    <SelectItem value="EXPENSE">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(editingCat?.type === "EXPENSE" || catForm.type === "EXPENSE") && (
              <div>
                <Label>Tipo de despesa</Label>
                <Select value={catForm.expenseType} onValueChange={(v) =>
                  setCatForm({ ...catForm, expenseType: v as ExpenseType })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="DIARIA">Diária</SelectItem>
                    <SelectItem value="INSUMOS">Insumos</SelectItem>
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

      {/* ─── Dialog: Editar Lançamento ─── */}
      <Dialog open={editDialog} onOpenChange={(o) => { if (!o) { setEditDialog(false); setEditingEntry(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <form onSubmit={saveEditEntry} className="space-y-4">
              {editingEntry.type === "EXPENSE" && (
                <div>
                  <Label>Tipo de despesa</Label>
                  <Select value={editForm.expenseType} onValueChange={(v) =>
                    setEditForm({ ...editForm, expenseType: v as ExpenseType })}>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MENSAL">Mensal</SelectItem>
                      <SelectItem value="DIARIA">Diária</SelectItem>
                      <SelectItem value="INSUMOS">Insumos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Categoria</Label>
                <Select value={editForm.categoryId} onValueChange={(v) => {
                  const cat = categories.find((c) => c.id === v);
                  setEditForm({
                    ...editForm,
                    categoryId: v,
                    expenseType: (cat?.expenseType as ExpenseType) || editForm.expenseType,
                  });
                }}>
                  <SelectTrigger><SelectValue placeholder="Manter atual..." /></SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c.type === editingEntry.type).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.expenseType ? ` (${EXPENSE_TYPE_LABELS[c.expenseType]})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={editForm.description} placeholder="Opcional"
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0.01" value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDialog(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1">Salvar</Button>
              </div>
            </form>
          )}
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
              <Input value={washerForm.name} onChange={(e) => setWasherForm({ ...washerForm, name: e.target.value })}
                placeholder="Nome completo" required />
            </div>
            <div>
              <Label>Diária Padrão (R$)</Label>
              <Input type="number" step="0.01" min="0" value={washerForm.dailyRate}
                onChange={(e) => setWasherForm({ ...washerForm, dailyRate: e.target.value })}
                placeholder="Ex: 100,00" inputMode="decimal" />
              <p className="text-xs text-muted-foreground mt-1">Valor pré-preenchido ao pagar diária</p>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={washerForm.phone} onChange={(e) => setWasherForm({ ...washerForm, phone: e.target.value })}
                placeholder="(11) 99999-0000" />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={washerForm.cpf} onChange={(e) => setWasherForm({ ...washerForm, cpf: e.target.value })}
                placeholder="000.000.000-00" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setWasherDialog(false)} disabled={washerSaving}>Cancelar</Button>
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
