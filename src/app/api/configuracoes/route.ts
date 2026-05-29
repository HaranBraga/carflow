import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterPrisma } from "@/lib/prisma-master";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { whatsappTemplate: true, evolutionApiUrl: true, evolutionInstance: true },
  });

  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { whatsappTemplate } = await req.json();

  const tenant = await masterPrisma.tenant.update({
    where: { id: tenantId },
    data: { whatsappTemplate: whatsappTemplate || null },
    select: { whatsappTemplate: true },
  });

  return NextResponse.json(tenant);
}
