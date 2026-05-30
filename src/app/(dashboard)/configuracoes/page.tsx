"use client";
import { useEffect, useState } from "react";
import { Settings, MessageCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_TEMPLATE = `Olá, {nome}! 🚗✨

Seu veículo está pronto!

Serviços realizados:
{servicos}

Estamos aguardando sua retirada. Obrigado pela preferência! 🙏`;

export default function ConfiguracoesPage() {
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/configuracoes")
      .then((r) => r.json())
      .then((d) => {
        setTemplate(d.whatsappTemplate || DEFAULT_TEMPLATE);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappTemplate: template === DEFAULT_TEMPLATE ? null : template }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function resetToDefault() {
    setTemplate(DEFAULT_TEMPLATE);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4" /> Mensagem WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Variáveis disponíveis:</p>
            <p><code className="bg-background px-1 rounded">{"{nome}"}</code> — Nome do cliente</p>
            <p><code className="bg-background px-1 rounded">{"{servicos}"}</code> — Lista de serviços realizados</p>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : (
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={resetToDefault} type="button">
              Restaurar padrão
            </Button>
            <Button onClick={save} disabled={saving || loading} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
