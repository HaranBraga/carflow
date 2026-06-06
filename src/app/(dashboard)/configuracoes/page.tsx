"use client";
import { useEffect, useState } from "react";
import { Settings, MessageCircle, Save, Link2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_TEMPLATE = `Olá, {nome}! 🚗✨

Seu veículo está pronto!

Serviços realizados:
{servicos}

Estamos aguardando sua retirada. Obrigado pela preferência! 🙏`;

type FeedbackConfig = {
  title: string;
  subtitle: string;
  showComment: boolean;
  showBirthdate: boolean;
  thankyouTitle: string;
  thankyouMessage: string;
};

const DEFAULT_FEEDBACK: FeedbackConfig = {
  title: "Como foi sua experiência?",
  subtitle: "Leva só 30 segundos e nos ajuda muito! 😊",
  showComment: true,
  showBirthdate: true,
  thankyouTitle: "Obrigado! 🙏",
  thankyouMessage: "Sua opinião nos ajuda a melhorar cada vez mais!",
};

export default function ConfiguracoesPage() {
  const [template, setTemplate] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [feedback, setFeedback] = useState<FeedbackConfig>(DEFAULT_FEEDBACK);
  const [loading, setLoading] = useState(true);
  const [savingWpp, setSavingWpp] = useState(false);
  const [savedWpp, setSavedWpp] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    fetch("/api/configuracoes")
      .then((r) => r.json())
      .then((d) => {
        setTemplate(d.whatsappTemplate || DEFAULT_TEMPLATE);
        setInstagramUrl(d.instagramUrl || "");
        if (d.feedbackConfig) {
          setFeedback({ ...DEFAULT_FEEDBACK, ...d.feedbackConfig });
        }
        setLoading(false);
      });
  }, []);

  async function saveWhatsapp() {
    setSavingWpp(true);
    setSavedWpp(false);
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsappTemplate: template === DEFAULT_TEMPLATE ? null : template }),
    });
    setSavingWpp(false);
    setSavedWpp(true);
    setTimeout(() => setSavedWpp(false), 3000);
  }

  async function saveFeedbackConfig() {
    setSavingFeedback(true);
    setSavedFeedback(false);
    await fetch("/api/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instagramUrl: instagramUrl.trim() || null,
        feedbackConfig: feedback,
      }),
    });
    setSavingFeedback(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  }

  function setF(key: keyof FeedbackConfig, value: any) {
    setFeedback((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Configurações</h1>
      </div>

      {/* WhatsApp */}
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
            <Button variant="outline" onClick={() => setTemplate(DEFAULT_TEMPLATE)} type="button">
              Restaurar padrão
            </Button>
            <Button onClick={saveWhatsapp} disabled={savingWpp || loading} className="gap-2">
              <Save className="w-4 h-4" />
              {savingWpp ? "Salvando..." : savedWpp ? "Salvo!" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feedback & Instagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="w-4 h-4 text-yellow-500" /> Formulário de Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Instagram */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-pink-500" /> Link do Instagram
            </Label>
            <Input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/seulavajato"
            />
            <p className="text-xs text-muted-foreground">
              Aparece no final da avaliação para o cliente seguir. Deixe vazio para não exibir.
            </p>
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium">Textos do formulário</p>

            <div className="grid gap-3">
              <div>
                <Label>Título</Label>
                <Input
                  value={feedback.title}
                  onChange={(e) => setF("title", e.target.value)}
                  placeholder={DEFAULT_FEEDBACK.title}
                />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input
                  value={feedback.subtitle}
                  onChange={(e) => setF("subtitle", e.target.value)}
                  placeholder={DEFAULT_FEEDBACK.subtitle}
                />
              </div>
              <div>
                <Label>Título do agradecimento</Label>
                <Input
                  value={feedback.thankyouTitle}
                  onChange={(e) => setF("thankyouTitle", e.target.value)}
                  placeholder={DEFAULT_FEEDBACK.thankyouTitle}
                />
              </div>
              <div>
                <Label>Mensagem de agradecimento</Label>
                <Textarea
                  value={feedback.thankyouMessage}
                  onChange={(e) => setF("thankyouMessage", e.target.value)}
                  placeholder={DEFAULT_FEEDBACK.thankyouMessage}
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Campos opcionais</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={feedback.showComment}
                onChange={(e) => setF("showComment", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Mostrar campo de comentário</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={feedback.showBirthdate}
                onChange={(e) => setF("showBirthdate", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Solicitar data de nascimento após avaliação</span>
            </label>
          </div>

          <Button onClick={saveFeedbackConfig} disabled={savingFeedback || loading} className="gap-2">
            <Save className="w-4 h-4" />
            {savingFeedback ? "Salvando..." : savedFeedback ? "Salvo!" : "Salvar configurações de feedback"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
