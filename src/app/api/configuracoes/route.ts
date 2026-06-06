import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterPrisma } from "@/lib/prisma-master";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      whatsappTemplate: true,
      evolutionApiUrl: true,
      evolutionInstance: true,
      instagramUrl: true,
      feedbackConfig: true,
    },
  });

  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const body = await req.json();
  const { whatsappTemplate, instagramUrl, feedbackConfig } = body;

  const data: any = {};
  if ("whatsappTemplate" in body) data.whatsappTemplate = whatsappTemplate || null;
  if ("instagramUrl" in body) data.instagramUrl = instagramUrl || null;
  if ("feedbackConfig" in body) data.feedbackConfig = feedbackConfig
    ? JSON.stringify(feedbackConfig)
    : null;

  const tenant = await masterPrisma.tenant.update({
    where: { id: tenantId },
    data,
    select: { whatsappTemplate: true, instagramUrl: true, feedbackConfig: true },
  });

  return NextResponse.json({
    ...tenant,
    feedbackConfig: tenant.feedbackConfig ? JSON.parse(tenant.feedbackConfig) : null,
  });
}
