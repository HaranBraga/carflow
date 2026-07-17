"use client";
import { useEffect, useState } from "react";
import { UserCog, Plus, Pencil, Trash2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MODULES } from "@/lib/permissions";

type User = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  isAdmin: boolean;
  permissions: string[];
  active: boolean;
  createdAt: string;
};

const emptyForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  isAdmin: false,
  active: true,
  permissions: [] as string[],
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setDialog(true);
  }

  function openEdit(u: User) {
    setForm({
      name: u.name,
      username: u.username,
      email: u.email ?? "",
      password: "",
      isAdmin: u.isAdmin,
      active: u.active,
      permissions: u.permissions,
    });
    setEditingId(u.id);
    setError("");
    setDialog(true);
  }

  function togglePermission(key: string) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: any = {
      name: form.name,
      username: form.username,
      email: form.email,
      isAdmin: form.isAdmin,
      permissions: form.permissions,
    };
    if (editingId) body.active = form.active;
    if (form.password) body.password = form.password;

    const res = editingId
      ? await fetch(`/api/usuarios/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao salvar usuário");
      return;
    }

    setDialog(false);
    setEditingId(null);
    setForm(emptyForm);
    fetchUsers();
  }

  async function remove(u: User) {
    if (!confirm(`Excluir o usuário "${u.name}"?`)) return;
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Erro ao excluir usuário");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Usuários</h1>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Novo Usuário</Button>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UserCog className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{u.name}</p>
                    <p className="text-sm text-muted-foreground truncate">@{u.username}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={u.active ? "success" : "secondary"}>{u.active ? "Ativo" : "Inativo"}</Badge>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(u)} title="Editar">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(u)} title="Excluir">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {u.isAdmin ? (
                  <p className="text-xs text-primary font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Administrador (acesso total)
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {u.permissions.length === 0
                      ? "Sem módulos liberados"
                      : u.permissions
                          .map((p) => MODULES.find((m) => m.key === p)?.label || p)
                          .join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={(o) => { if (!o) { setDialog(false); setEditingId(null); } }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" required />
            </div>
            <div>
              <Label>Usuário de login *</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, ".") })}
                placeholder="joao.silva"
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="opcional" />
            </div>
            <div>
              <Label>Senha {editingId && <span className="text-muted-foreground text-xs">(deixe vazio para manter a atual)</span>}</Label>
              <div className="relative">
                <Input
                  value={form.password}
                  type={showPassword ? "text" : "password"}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingId ? "••••••••" : "mínimo 6 caracteres"}
                  minLength={6}
                  required={!editingId}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAdmin}
                onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm font-medium flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> Administrador</p>
                <p className="text-xs text-muted-foreground">Acesso total ao sistema, incluindo esta tela de usuários.</p>
              </div>
            </label>

            {editingId && (
              <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <p className="text-sm font-medium">Usuário ativo (permite login)</p>
              </label>
            )}

            {!form.isAdmin && (
              <div className="space-y-2">
                <Label>Módulos liberados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MODULES.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm rounded-lg border p-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(m.key)}
                        onChange={() => togglePermission(m.key)}
                        className="w-4 h-4"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialog(false)} disabled={saving}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
