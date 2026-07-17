import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { sendWhatsAppMessage, buildCarReadyMessage } from "@/lib/evolution";

export async function POST(req: NextRequest) {
  try {
    try {
      await requireAuth();
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

    if (!order) {
      return NextResponse.json({ sent: false, error: "Ordem não encontrada" }, { status: 404 });
    }

    const settings = await prisma.settings.findUnique({
      where: { id: "default" },
      select: { whatsappTemplate: true },
    });

    const customerName = order.vehicle.customer.name;
    const plate = order.vehicle.plate;
    const services = order.items.map((i) => i.service.name);
    const phone = order.vehicle.customer.phone;

    const message = buildCarReadyMessage(customerName, plate, services, settings?.whatsappTemplate);
    const result = await sendWhatsAppMessage(phone, message, {
      apiUrl: process.env.EVOLUTION_API_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instance: process.env.EVOLUTION_INSTANCE,
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
      url: result.url,
      status: result.status,
      error: result.error,
      message,
    }, { status: result.sent ? 200 : 502 });
  } catch (e: any) {
    return NextResponse.json({ sent: false, error: `Erro interno: ${e?.message || "desconhecido"}` }, { status: 500 });
  }
}
