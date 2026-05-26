import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { formatPlate } from "@/lib/utils";

const vehicleSchema = z.object({
  customerId: z.string(),
  plate: z.string().min(7).max(8),
  model: z.string().min(1),
  brand: z.string().optional(),
  color: z.string().optional(),
  category: z.enum(["POPULAR", "SUV_MEDIO", "SUV_GRANDE", "CAMIONETE", "VAN_CAMINHAO", "MOTO", "TAPETE_RESIDENCIAL"]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { searchParams } = new URL(req.url);
  const plate = searchParams.get("plate");
  const customerId = searchParams.get("customerId");

  if (plate) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { tenantId, plate: formatPlate(plate) },
      include: { customer: true },
    });
    return NextResponse.json(vehicle);
  }

  if (customerId) {
    const vehicles = await prisma.vehicle.findMany({
      where: { tenantId, customerId },
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
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const body = await req.json();
  const data = vehicleSchema.parse(body);

  const existing = await prisma.vehicle.findFirst({
    where: { tenantId, plate: formatPlate(data.plate) },
    include: { customer: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Placa já cadastrada", vehicle: existing }, { status: 409 });
  }

  const vehicle = await prisma.vehicle.create({
    data: { ...data, plate: formatPlate(data.plate), tenantId },
    include: { customer: true },
  });

  return NextResponse.json(vehicle, { status: 201 });
}
