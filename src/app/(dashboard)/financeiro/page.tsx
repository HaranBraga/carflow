"use client";
import { useEffect, useState } from "react";
import { DollarSign, Plus, TrendingUp, TrendingDown, Minus, Tag, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Category = { id: string; name: string; type: "INCOME" | "EXPENSE" };
type Entry = { id: string; date: string; type: string; category: string; description: string; amount: number };

export default function FinanceiroPage() {
  const [tab, setTab] = useState("lancamentos");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<{ entries: Entry[]; totalIncome: number; totalExpense: number; balance: number }>({
    entries: [], totalIncome: 0, totalExpense: 0, balance: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [entryDialog, setEntryDialog] = useState(false);
  const [entryForm, setEntryForm] = useState({ type: "INCOME", categoryId: "", category: "", description: "", amount: "" });
  const [catDialog, setCatDialog] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", type: "INCOME" as "INCOME" | "EXPENSE" });
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  async function loadEntries(d = date) {
    setLoading(true);
    const res = await fetch(`/api/caixa?date=${d}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function loadCategories() {
    const res = await fetch("/api/financeiro/categorias");
    if (res.ok) setCategories(await res.json());
  }

  useEffect(() => { loadEntries(); loadCategories(); }, []);
  useEffect(() => { loadEntries(date); }, [date]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const cat = categories.find((c) => c.id === entryForm.categoryId);
    await fetch("/api/caixa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: entryForm.type,
        category: cat?.name || entryForm.category || "Geral",
        description: entryForm.description,
        amount: parseFloat(entryForm.amount),
      }),
    });
    setEntryDialog(false);
    setEntryForm({ type: "INCOME", categoryId: "", category: "", description: "", amount: "" });
    loadEntries();
  }

  async function addCategory(e: React.FormEvent) {
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

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Financeiro</h1>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>

        {/* LANÇAMENTOS */}
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
                  <p className="text-lg font-bold text-green-600">{formatCurrency(data.totalIncome)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(data.totalExpense)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${data.balance >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                  <Minus className={`w-5 h-5 ${data.balance >= 0 ? "text-blue-600" : "text-red-600"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className={`text-lg font-bold ${data.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(data.balance)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : data.entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum lançamento para este dia.</p>
              ) : (
                <div className="divide-y">
                  {data.entries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${entry.type === "INCOME" ? "bg-green-500" : "bg-red-500"}`} />
                        <div>
                          <p className="text-sm font-medium">{entry.description}</p>
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

        {/* CATEGORIAS */}
        <TabsContent value="categorias" className="mt-4 space-y-4">
          <Button onClick={() => { setCatForm({ name: "", type: "INCOME" }); setEditingCat(null); setCatDialog(true); }} className="gap-1">
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
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                          onClick={() => { setEditingCat(c); setCatForm({ name: c.name, type: c.type }); setCatDialog(true); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => deleteCategory(c.id)}>
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

      {/* Dialog: novo lançamento */}
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
              <Input value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} required />
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

      {/* Dialog: categoria */}
      <Dialog open={catDialog} onOpenChange={(o) => { if (!o) { setCatDialog(false); setEditingCat(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle></DialogHeader>
          <form onSubmit={addCategory} className="space-y-3">
            {!editingCat && (
              <div>
                <Label>Tipo</Label>
                <Select value={catForm.type} onValueChange={(v: any) => setCatForm({ ...catForm, type: v })}>
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
    </div>
  );
}
