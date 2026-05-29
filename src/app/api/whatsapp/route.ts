import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { masterPrisma } from "@/lib/prisma-master";
import { sendWhatsAppMessage, buildCarReadyMessage } from "@/lib/evolution";

export async function POST(req: NextRequest) {
  try {
    let prisma, evolutionApiUrl, evolutionApiKey, evolutionInstance, tenantId;
    try {
      ({ prisma, evolutionApiUrl, evolutionApiKey, evolutionInstance, tenantId } = await getTenantPrisma());
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

    // Busca template customizado da empresa
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappTemplate: true },
    });

    const customerName = order.vehicle.customer.name;
    const plate = order.vehicle.plate;
    const services = order.items.map((i) => i.service.name);
    const phone = order.vehicle.customer.phone;

    const message = buildCarReadyMessage(customerName, plate, services, tenant?.whatsappTemplate);
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
      url: result.url,
      status: result.status,
      error: result.error,
      message,
    }, { status: result.sent ? 200 : 502 });
  } catch (e: any) {
    return NextResponse.json({ sent: false, error: `Erro interno: ${e?.message || "desconhecido"}` }, { status: 500 });
  }
}
