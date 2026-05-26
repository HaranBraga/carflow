import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, buildCarReadyMessage } from "@/lib/evolution";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { orderId } = await req.json();

  const order = await prisma.serviceOrder.findFirst({
    where: { id: orderId, tenantId },
    include: {
      vehicle: { include: { customer: true } },
      items: { include: { service: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const customerName = order.vehicle.customer.name;
  const plate = order.vehicle.plate;
  const services = order.items.map((i) => i.service.name);
  const phone = order.vehicle.customer.phone;

  const message = buildCarReadyMessage(customerName, plate, services);
  const sent = await sendWhatsAppMessage(phone, message);

  if (sent) {
    await prisma.serviceOrder.update({
      where: { id: orderId },
      data: { whatsappSent: true },
    });
  }

  return NextResponse.json({ sent, message });
}
