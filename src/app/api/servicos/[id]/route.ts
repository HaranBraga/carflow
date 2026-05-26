import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const VEHICLE_CATEGORIES = [
  "POPULAR", "SUV_MEDIO", "SUV_GRANDE", "CAMIONETE",
  "VAN_CAMINHAO", "MOTO", "TAPETE_RESIDENCIAL",
] as const;

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  basePrice: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
  prices: z.array(z.object({
    category: z.enum(VEHICLE_CATEGORIES),
    price: z.number().nonnegative(),
  })).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let data;
  try {
    data = updateSchema.parse(await req.json());
  } catch (e: any) {
    const detail = e?.issues?.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ") || e?.message;
    return NextResponse.json({ error: `Dados inválidos: ${detail}` }, { status: 400 });
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
  if (data.active !== undefined) updateData.active = data.active;

  try {
    if (data.prices !== undefined) {
      await prisma.servicePrice.deleteMany({ where: { serviceId: id } });
      if (data.prices.length > 0) {
        await prisma.servicePrice.createMany({
          data: data.prices.map((p) => ({ serviceId: id, category: p.category as any, price: p.price })),
        });
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: { prices: true },
    });
    return NextResponse.json(service);
  } catch (e: any) {
    const msg = e?.message || "Erro ao atualizar serviço";
    const hint = msg.includes("service_prices") || msg.includes("does not exist")
      ? " (Dica: rode 'Sincronizar Schema' no /admin para criar as tabelas novas.)"
      : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    await prisma.service.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao desativar serviço" }, { status: 500 });
  }
}
