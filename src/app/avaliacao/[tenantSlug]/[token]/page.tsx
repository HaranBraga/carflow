"use client";
import { use, useState } from "react";
import { Star, Send, CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default function AvaliacaoPage({ params }: { params: Promise<{ tenantSlug: string; token: string }> }) {
  const { tenantSlug, token } = use(params);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com";

  async function submit() {
    if (rating === 0) { setError("Por favor, selecione uma nota."); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, tenantSlug, rating, comment }),
    });

    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error || "Erro ao enviar avaliação.");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Obrigado pela avaliação!</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Sua opinião é muito importante para nós. Você está concorrendo a um serviço gratuito no sorteio!
              </p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4">
              <p className="text-white font-medium text-sm mb-3">Nos siga no Instagram para não perder o resultado do sorteio!</p>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-white text-purple-600 hover:bg-white/90 w-full gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Seguir no Instagram
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="max-w-sm w-full">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">Avalie nosso serviço</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Sua avaliação nos ajuda a melhorar. Responda e concorra a um serviço grátis!
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-center mb-3">Como você avalia nosso atendimento?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hovered || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm mt-2 text-muted-foreground">
                {["", "Muito ruim", "Ruim", "Regular", "Bom", "Excelente!"][rating]}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Comentário (opcional)</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="O que podemos melhorar? O que você amou?"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button className="w-full gap-2" onClick={submit} disabled={loading}>
            <Send className="w-4 h-4" />
            {loading ? "Enviando..." : "Enviar Avaliação"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Avaliação única por QR Code. Sorteio realizado mensalmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
