import { NextRequest, NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma-master";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { instagramUrl: true, feedbackConfig: true },
  });

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const feedbackConfig = tenant.feedbackConfig
    ? JSON.parse(tenant.feedbackConfig as string)
    : {};

  return NextResponse.json({
    instagramUrl: tenant.instagramUrl ?? "",
    ...feedbackConfig,
  });
}
