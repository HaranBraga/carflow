import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const orderSchema = z.object({
  vehicleId: z.string(),
  washerId: z.string().optional(),
  notes: z.string().optional(),
  services: z.array(z.object({
    serviceId: z.string(),
    quantity: z.number().default(1),
    unitPrice: z.number(),
    discount: z.number().default(0),
  })).default([]),
  checklist: z.array(z.object({
    area: z.string(),
    hasIssue: z.boolean(),
    notes: z.string().optional(),
  })).default([]),
  opportunities: z.array(z.object({
    description: z.string(),
    estimatedValue: z.number().optional(),
  })).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const date = searchParams.get("date");

  const where: any = { tenantId };

  if (status === "active") {
    where.status = { in: ["WAITING", "IN_PROGRESS"] };
  } else if (status) {
    where.status = status;
  }

  if (date) {
    const d = new Date(date);
    where.arrivedAt = {
      gte: new Date(d.setHours(0, 0, 0, 0)),
      lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const orders = await prisma.serviceOrder.findMany({
    where,
    include: {
      vehicle: { include: { customer: true } },
      washer: true,
      items: { include: { service: true } },
      checklist: true,
      opportunities: true,
      manager: { select: { name: true } },
    },
    orderBy: { arrivedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const managerId = session.user.id!;

  const body = await req.json();
  const data = orderSchema.parse(body);

  const totalAmount = data.services.reduce((sum, s) => {
    return sum + (s.unitPrice * s.quantity - s.discount);
  }, 0);

  const order = await prisma.serviceOrder.create({
    data: {
      tenantId,
      vehicleId: data.vehicleId,
      managerId,
      washerId: data.washerId,
      notes: data.notes,
      totalAmount,
      items: {
        create: data.services.map((s) => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          discount: s.discount,
          total: s.unitPrice * s.quantity - s.discount,
        })),
      },
      checklist: {
        create: data.checklist,
      },
      opportunities: {
        create: data.opportunities,
      },
    },
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
    },
  });

  // Registrar no caixa se tiver serviços
  if (totalAmount > 0) {
    await prisma.cashFlow.create({
      data: {
        tenantId,
        type: "INCOME",
        category: "Lavagem",
        description: `Ordem #${order.id.slice(-6)} - ${order.vehicle.plate}`,
        amount: totalAmount,
        orderId: order.id,
      },
    });
  }

  return NextResponse.json(order, { status: 201 });
}
