import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

const DEFAULTS: Record<string, string> = {
  POPULAR: "Carro Popular",
  SUV_MEDIO: "SUV Médio",
  SUV_GRANDE: "SUV Grande",
  CAMIONETE: "Camionete",
  VAN_CAMINHAO: "Van / Caminhão",
  MOTO: "Moto",
  TAPETE_RESIDENCIAL: "Tapete Residencial",
};

export async function GET() {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const saved = await prisma.vehicleCategoryLabel.findMany();
  const savedMap: Record<string, string> = {};
  saved.forEach((r) => { savedMap[r.category] = r.label; });

  const result = Object.entries(DEFAULTS).map(([category, defaultLabel]) => ({
    category,
    label: savedMap[category] ?? defaultLabel,
  }));

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const updates: { category: string; label: string }[] = await req.json();

  for (const { category, label } of updates) {
    if (!DEFAULTS[category]) continue;
    await prisma.vehicleCategoryLabel.upsert({
      where: { category },
      update: { label },
      create: { category, label },
    });
  }

  return NextResponse.json({ ok: true });
}
