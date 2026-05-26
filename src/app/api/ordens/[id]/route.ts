import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const { status, washerId, whatsappSent } = body;

  const order = await prisma.serviceOrder.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updateData: any = {};
  if (status) {
    updateData.status = status;
    if (status === "IN_PROGRESS" && !order.startedAt) updateData.startedAt = new Date();
    if (status === "FINISHED" && !order.finishedAt) updateData.finishedAt = new Date();
  }
  if (washerId !== undefined) updateData.washerId = washerId;
  if (whatsappSent !== undefined) updateData.whatsappSent = whatsappSent;

  const updated = await prisma.serviceOrder.update({
    where: { id },
    data: updateData,
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
      washer: true,
    },
  });

  return NextResponse.json(updated);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
      checklist: true,
      opportunities: true,
      washer: true,
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
