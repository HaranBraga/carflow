"use client";
import { use, useState, useEffect } from "react";
import { Star, Send, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function AvaliacaoPage({ params }: { params: Promise<{ tenantSlug: string; token: string }> }) {
  const { tenantSlug, token } = use(params);
  const [step, setStep] = useState<"rating" | "dados" | "done">("rating");
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  useEffect(() => {
    setInstagramUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com");
  }, []);

  const ratingLabels = ["", "Muito ruim 😞", "Ruim 😕", "Regular 😐", "Bom 😊", "Excelente! 🤩"];

  async function submit() {
    if (rating === 0) { setError("Por favor, selecione uma nota."); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        tenantSlug,
        rating,
        comment,
        birthdate: birthdate || undefined,
        instagramFollowed: false,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setStep("dados");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erro ao enviar avaliação.");
    }
  }

  async function saveData() {
    setStep("done");
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Obrigado! 🙏</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Sua opinião nos ajuda a melhorar cada vez mais!
              </p>
            </div>

            {instagramUrl && instagramUrl !== "https://instagram.com" && (
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-2xl p-4 space-y-3">
                <p className="text-white font-medium text-sm">Nos siga no Instagram e fique por dentro de promoções!</p>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer"
                  onClick={async () => {
                    await fetch("/api/feedback", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ token, tenantSlug, rating, instagramFollowed: true }),
                    });
                  }}>
                  <Button className="bg-white text-pink-600 hover:bg-white/90 w-full gap-2 font-semibold">
                    <ExternalLink className="w-4 h-4" />
                    Seguir no Instagram
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "dados") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-bold">Avaliação enviada!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Aproveite para nos contar mais sobre você 👇
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Data de nascimento <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-muted-foreground mt-1">Para ganhar desconto especial no aniversário! 🎂</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1 text-muted-foreground" onClick={saveData}>
                Pular
              </Button>
              <Button className="flex-1" onClick={async () => {
                if (birthdate) {
                  await fetch("/api/feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, tenantSlug, rating, birthdate }),
                  });
                }
                saveData();
              }}>
                Salvar e continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Como foi sua experiência?</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Leva só 30 segundos e nos ajuda muito! 😊
            </p>
          </div>

          {/* Rating */}
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-12 h-12 transition-colors ${
                      star <= (hovered || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-200"
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p className="text-sm font-medium text-muted-foreground animate-in fade-in">
                {ratingLabels[hovered || rating]}
              </p>
            )}
          </div>

          {/* Comentário */}
          <div>
            <Label>Comentário <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que você achou? O que podemos melhorar?"
              rows={3}
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button
            className="w-full gap-2 h-12 text-base"
            onClick={submit}
            disabled={loading || rating === 0}
          >
            <Send className="w-4 h-4" />
            {loading ? "Enviando..." : "Enviar Avaliação"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Avaliação única por atendimento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
