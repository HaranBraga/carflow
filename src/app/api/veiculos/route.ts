import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";
import { formatPlate } from "@/lib/utils";

const vehicleSchema = z.object({
  customerId: z.string(),
  plate: z.string().min(7).max(8),
  model: z.string().default(""),
  brand: z.string().optional(),
  color: z.string().optional(),
  category: z.enum(["POPULAR", "SUV_MEDIO", "SUV_GRANDE", "CAMIONETE", "VAN_CAMINHAO", "MOTO", "TAPETE_RESIDENCIAL"]),
});

export async function GET(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const plate = searchParams.get("plate");
  const customerId = searchParams.get("customerId");

  if (plate) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { plate: formatPlate(plate) },
      include: { customer: true },
    });
    return NextResponse.json(vehicle);
  }

  if (customerId) {
    const vehicles = await prisma.vehicle.findMany({
      where: { customerId },
      include: {
        orders: {
          orderBy: { arrivedAt: "desc" },
          take: 1,
          include: { items: { include: { service: true } } },
        },
      },
    });
    return NextResponse.json(vehicles);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = vehicleSchema.parse(body);

  const existing = await prisma.vehicle.findFirst({
    where: { plate: formatPlate(data.plate) },
    include: { customer: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Placa já cadastrada", vehicle: existing }, { status: 409 });
  }

  const vehicle = await prisma.vehicle.create({
    data: { ...data, plate: formatPlate(data.plate) },
    include: { customer: true },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
