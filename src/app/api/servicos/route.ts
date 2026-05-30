import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const VEHICLE_CATEGORIES = [
  "POPULAR", "SUV_MEDIO", "SUV_GRANDE", "CAMIONETE",
  "VAN_CAMINHAO", "MOTO", "TAPETE_RESIDENCIAL",
] as const;

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  basePrice: z.number().nonnegative(),
  categoryId: z.string().nullable().optional(),
  pricingType: z.enum(["FIXED", "PER_M2"]).default("FIXED"),
  prices: z.array(z.object({
    category: z.enum(VEHICLE_CATEGORIES),
    price: z.number().nonnegative(),
  })).default([]),
});

export async function GET() {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      include: { prices: true, category: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao listar serviços" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data;
  try {
    data = serviceSchema.parse(await req.json());
  } catch (e: any) {
    const detail = e?.issues?.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") || e?.message;
    return NextResponse.json({ error: `Dados inválidos: ${detail}` }, { status: 400 });
  }

  try {
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        basePrice: data.basePrice,
        pricingType: data.pricingType as any,
        categoryId: data.categoryId || null,
        prices: {
          create: data.prices.map((p) => ({ category: p.category as any, price: p.price })),
        },
      },
      include: { prices: true, category: true },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "Erro ao criar serviço";
    const hint = msg.includes("service_prices") || msg.includes("does not exist")
      ? " (Dica: rode 'Sincronizar Schema' no /admin para criar as tabelas novas.)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}
