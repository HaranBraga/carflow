"use client";
import { useState, useEffect } from "react";
import { Building2, Plus, LogOut, Users, Lock, Eye, EyeOff, Database, MessageCircle, Pencil, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  active: boolean;
  databaseUrl: string;
  evolutionApiUrl: string | null;
  evolutionApiKey: string | null;
  evolutionInstance: string | null;
  createdAt: string;
  users: { id: string; name: string; username: string | null; email: string | null; active: boolean }[];
};

const emptyForm = {
  tenantName: "", tenantSlug: "", phone: "", address: "",
  databaseUrl: "",
  evolutionApiUrl: "", evolutionApiKey: "", evolutionInstance: "",
  adminName: "", adminUsername: "", adminPassword: "",
};

type Mode = "list" | "create" | "edit";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  useEffect(() => {
    if (authed) loadTenants();
  }, [authed]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret }),
    });
    if (res.ok) setAuthed(true);
    else setAuthError("Senha incorreta.");
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
    setTenants([]);
  }

  async function loadTenants() {
    setLoading(true);
    const res = await fetch("/api/admin/tenants");
    if (res.ok) setTenants(await res.json());
    setLoading(false);
  }

  function startCreate() {
    setForm(emptyForm);
    setFormError("");
    setFormSuccess("");
    setEditingId(null);
    setMode("create");
  }

  function startEdit(t: Tenant) {
    setForm({
      tenantName: t.name,
      tenantSlug: t.slug,
      phone: t.phone ?? "",
      address: t.address ?? "",
      databaseUrl: t.databaseUrl,
      evolutionApiUrl: t.evolutionApiUrl ?? "",
      evolutionApiKey: "",
      evolutionInstance: t.evolutionInstance ?? "",
      adminName: "",
      adminUsername: "",
      adminPassword: "",
    });
    setFormError("");
    setFormSuccess("");
    setEditingId(t.id);
    setMode("edit");
  }

  function cancelForm() {
    setMode("list");
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    let res: Response;
    if (mode === "create") {
      res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      res = await fetch(`/api/admin/tenants/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.tenantName,
          slug: form.tenantSlug,
          phone: form.phone,
          address: form.address,
          databaseUrl: form.databaseUrl,
          evolutionApiUrl: form.evolutionApiUrl,
          evolutionApiKey: form.evolutionApiKey,
          evolutionInstance: form.evolutionInstance,
        }),
      });
    }

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setFormError(data.error || "Erro");
      return;
    }

    setFormSuccess(mode === "create" ? `Empresa "${data.name}" criada!` : `Empresa "${data.name}" atualizada!`);
    cancelForm();
    loadTenants();
  }

  async function toggleActive(t: Tenant) {
    await fetch(`/api/admin/tenants/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    });
    loadTenants();
  }

  async function deleteTenant(t: Tenant) {
    if (!confirm(`Excluir empresa "${t.name}"? O banco de dados dela NÃO será removido — apenas o registro no master.`)) return;
    const res = await fetch(`/api/admin/tenants/${t.id}`, { method: "DELETE" });
    if (res.ok) {
      setFormSuccess(`Empresa "${t.name}" excluída.`);
      loadTenants();
    } else {
      const data = await res.json();
      setFormError(data.error || "Erro ao excluir");
    }
  }

  function slugify(value: string) {
    return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <Card className="w-full max-w-sm bg-gray-900 border-gray-800">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-2">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-white">CarFlow Admin</CardTitle>
            <p className="text-gray-400 text-sm">Acesso restrito</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Senha de administrador</Label>
                <Input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="••••••••"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Entrar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showForm = mode === "create" || mode === "edit";
  const isEdit = mode === "edit";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">CarFlow Admin</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Empresas cadastradas</h2>
            <p className="text-gray-400 text-sm mt-1">{tenants.length} empresa(s)</p>
          </div>
          {!showForm && (
            <Button onClick={startCreate} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="w-4 h-4" /> Nova Empresa
            </Button>
          )}
        </div>

        {formSuccess && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm">
            {formSuccess}
          </div>
        )}

        {showForm && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">
                {isEdit ? `Editar empresa` : "Nova Empresa"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Nome da empresa *</Label>
                  <Input value={form.tenantName} placeholder="Lava-Jato do João"
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, tenantName: e.target.value, tenantSlug: isEdit ? form.tenantSlug : slugify(e.target.value) })}
                    required />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Slug (identificador) *</Label>
                  <Input value={form.tenantSlug} placeholder="lava-jato-joao"
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, tenantSlug: slugify(e.target.value) })}
                    required />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Telefone</Label>
                  <Input value={form.phone} placeholder="(11) 99999-0000"
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Endereço</Label>
                  <Input value={form.address} placeholder="Rua das Flores, 123"
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                <div className="col-span-full border-t border-gray-700 pt-4">
                  <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Banco de dados da empresa
                  </p>
                  {isEdit ? (
                    <p className="text-yellow-500 text-xs mb-3">
                      ⚠ Cuidado ao trocar a URL: as tabelas só serão criadas na PRIMEIRA criação. Alterar aqui só re-aponta para outro banco existente.
                    </p>
                  ) : (
                    <p className="text-gray-500 text-xs mb-3">
                      Crie um banco PostgreSQL para esta empresa e cole a URL completa. As tabelas serão criadas automaticamente.
                    </p>
                  )}
                </div>
                <div className="space-y-2 col-span-full">
                  <Label className="text-gray-300">DATABASE_URL *</Label>
                  <Input value={form.databaseUrl}
                    placeholder="postgresql://user:pass@host:5432/lava_jato_joao"
                    className="bg-gray-800 border-gray-700 text-white font-mono text-xs"
                    onChange={(e) => setForm({ ...form, databaseUrl: e.target.value })}
                    required />
                </div>

                <div className="col-span-full border-t border-gray-700 pt-4">
                  <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" /> WhatsApp (Evolution API) — opcional
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">URL da Evolution API</Label>
                  <Input value={form.evolutionApiUrl}
                    placeholder="https://evolution.exemplo.com"
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, evolutionApiUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Instância</Label>
                  <Input value={form.evolutionInstance}
                    placeholder="nome-da-instancia"
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, evolutionInstance: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-full">
                  <Label className="text-gray-300">API Key {isEdit && <span className="text-gray-500 text-xs">(deixe vazio para manter a atual)</span>}</Label>
                  <Input value={form.evolutionApiKey} type="password"
                    placeholder={isEdit ? "••••• (mantém a anterior)" : "API Key"}
                    className="bg-gray-800 border-gray-700 text-white"
                    onChange={(e) => setForm({ ...form, evolutionApiKey: e.target.value })} />
                </div>

                {!isEdit && (
                  <>
                    <div className="col-span-full border-t border-gray-700 pt-4">
                      <p className="text-gray-400 text-sm font-medium mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Usuário Admin
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Nome completo *</Label>
                      <Input value={form.adminName} placeholder="João Silva"
                        className="bg-gray-800 border-gray-700 text-white"
                        onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                        required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">Usuário de login *</Label>
                      <Input value={form.adminUsername} placeholder="joao.lavajato"
                        className="bg-gray-800 border-gray-700 text-white"
                        onChange={(e) => setForm({ ...form, adminUsername: e.target.value.toLowerCase().replace(/\s/g, ".") })}
                        required />
                    </div>
                    <div className="space-y-2 col-span-full">
                      <Label className="text-gray-300">Senha *</Label>
                      <div className="relative">
                        <Input value={form.adminPassword} type={showPassword ? "text" : "password"}
                          placeholder="mínimo 6 caracteres"
                          className="bg-gray-800 border-gray-700 text-white pr-10"
                          onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                          minLength={6} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {formError && (
                  <div className="col-span-full bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm whitespace-pre-wrap">
                    {formError}
                  </div>
                )}

                <div className="col-span-full flex gap-3 justify-end">
                  <Button type="button" variant="ghost" onClick={cancelForm}
                    className="text-gray-400 hover:text-white" disabled={submitting}>Cancelar</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting}>
                    {submitting ? (isEdit ? "Salvando..." : "Criando...") : (isEdit ? "Salvar alterações" : "Criar Empresa")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-12">Carregando...</p>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma empresa cadastrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((t) => (
              <Card key={t.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{t.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.active ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                          {t.active ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        slug: <code className="text-blue-400">{t.slug}</code>
                        {t.phone && <span className="ml-3">{t.phone}</span>}
                      </p>
                      {t.evolutionInstance && (
                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {t.evolutionInstance}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">
                        Admin(s): {t.users.map((u) => u.username ?? u.email).join(", ")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t)}
                        className="text-gray-400 hover:text-white" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(t)}
                        className={t.active ? "text-yellow-400 hover:text-yellow-300" : "text-green-400 hover:text-green-300"}
                        title={t.active ? "Desativar" : "Ativar"}>
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTenant(t)}
                        className="text-red-400 hover:text-red-300" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
