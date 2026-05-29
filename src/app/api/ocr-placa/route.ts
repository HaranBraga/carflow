import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.PLATE_RECOGNIZER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "PLATE_RECOGNIZER_API_KEY não configurada." }, { status: 503 });
  }

  const { imageBase64 } = await req.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "Imagem não enviada." }, { status: 400 });
  }

  // Converte base64 para Blob
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const blob = new Blob([buffer], { type: "image/jpeg" });

  const form = new FormData();
  form.append("upload", blob, "placa.jpg");
  form.append("regions", "br"); // prioriza padrão brasileiro

  try {
    const res = await fetch("https://api.platerecognizer.com/v1/plate-reader/", {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}` },
      body: form,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: `Plate Recognizer: ${JSON.stringify(data)}` }, { status: 502 });
    }

    const result = data.results?.[0];
    if (!result) {
      return NextResponse.json({ plate: "", score: 0 });
    }

    return NextResponse.json({
      plate: result.plate?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "",
      score: result.score ?? 0,
      region: result.region?.code ?? "",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro de rede" }, { status: 500 });
  }
}
