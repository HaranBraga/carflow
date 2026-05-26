import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const body = await req.json();
  const { status, washerId, whatsappSent } = body;

  const order = await prisma.serviceOrder.findFirst({ where: { id: params.id, tenantId } });
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
    where: { id: params.id },
    data: updateData,
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
      washer: true,
    },
  });

  return NextResponse.json(updated);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const order = await prisma.serviceOrder.findFirst({
    where: { id: params.id, tenantId },
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
      checklist: true,
      opportunities: true,
      washer: true,
      manager: { select: { name: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}
