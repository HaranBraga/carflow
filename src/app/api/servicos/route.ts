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

  const services = await prisma.service.findMany({
    where: { active: true },
    include: { prices: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = serviceSchema.parse(body);

  const service = await prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      basePrice: data.basePrice,
      prices: {
        create: data.prices.map((p) => ({ category: p.category as any, price: p.price })),
      },
    },
    include: { prices: true },
  });

  return NextResponse.json(service, { status: 201 });
}
