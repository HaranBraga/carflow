"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DollarSign, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES_INCOME = ["Lavagem", "Polimento", "Higienização", "Outro"];
const CATEGORIES_EXPENSE = ["Lavador", "Produto", "Aluguel", "Conta", "Equipamento", "Outro"];

export default function CaixaPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any>({ entries: [], totalIncome: 0, totalExpense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState({ type: "INCOME", category: "Lavagem", description: "", amount: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  async function fetchCaixa() {
    setLoading(true);
    const res = await fetch(`/api/caixa?date=${date}`);
    setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchCaixa(); }, [date]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/caixa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newEntry, amount: parseFloat(newEntry.amount) }),
    });
    setDialogOpen(false);
    setNewEntry({ type: "INCOME", category: "Lavagem", description: "", amount: "" });
    fetchCaixa();
  }

  const categories = newEntry.type === "INCOME" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Caixa do Dia</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-1" />Lançar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
              <form onSubmit={addEntry} className="space-y-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={newEntry.type} onValueChange={(v) => setNewEntry({ ...newEntry, type: v, category: v === "INCOME" ? "Lavagem" : "Lavador" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Receita</SelectItem>
                      <SelectItem value="EXPENSE">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={newEntry.category} onValueChange={(v) => setNewEntry({ ...newEntry, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="Descreva o lançamento" required />
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" min="0.01" value={newEntry.amount} onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })} placeholder="0,00" required />
                </div>
                <Button type="submit" className="w-full">Confirmar Lançamento</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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
              <p className={`text-lg font-bold ${data.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>{formatCurrency(data.balance)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : data.entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum lançamento para este dia</p>
          ) : (
            <div className="space-y-2">
              {data.entries.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${entry.type === "INCOME" ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className="text-sm font-medium">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">{entry.category} · {format(new Date(entry.date), "HH:mm")}</p>
                    </div>
                  </div>
                  <span className={`font-semibold ${entry.type === "INCOME" ? "text-green-600" : "text-red-600"}`}>
                    {entry.type === "EXPENSE" ? "-" : "+"}{formatCurrency(Number(entry.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
