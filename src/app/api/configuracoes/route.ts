import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

const SETTINGS_ID = "default";

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
    select: { whatsappTemplate: true },
  });

  return NextResponse.json({ whatsappTemplate: settings?.whatsappTemplate ?? null });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { whatsappTemplate } = body;

  const settings = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: { whatsappTemplate: whatsappTemplate || null },
    create: { id: SETTINGS_ID, whatsappTemplate: whatsappTemplate || null },
    select: { whatsappTemplate: true },
  });

  return NextResponse.json(settings);
}
