import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { sendWhatsAppMessage, buildCarReadyMessage } from "@/lib/evolution";

export async function POST(req: NextRequest) {
  let prisma, evolutionApiUrl, evolutionApiKey, evolutionInstance;
  try {
    ({ prisma, evolutionApiUrl, evolutionApiKey, evolutionInstance } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json();

  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
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
  const result = await sendWhatsAppMessage(phone, message, {
    apiUrl: evolutionApiUrl,
    apiKey: evolutionApiKey,
    instance: evolutionInstance,
  });

  if (result.sent) {
    await prisma.serviceOrder.update({
      where: { id: orderId },
      data: { whatsappSent: true },
    });
  }

  return NextResponse.json({
    sent: result.sent,
    number: result.number,
    error: result.error,
    message,
  }, { status: result.sent ? 200 : 502 });
}
