import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, getTenantPrismaByUrl } from "@/lib/prisma-tenant";
import { masterPrisma } from "@/lib/prisma-master";
import { z } from "zod";
import QRCode from "qrcode";

const feedbackSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string().optional(),
  token: z.string(),
  tenantSlug: z.string(),
});

export async function GET(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  const feedbacks = await prisma.feedback.findMany({
    where: customerId ? { customerId } : {},
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.token && body.rating !== undefined && body.tenantSlug) {
    const data = feedbackSchema.parse(body);

    const tenant = await masterPrisma.tenant.findUnique({ where: { slug: data.tenantSlug } });
    if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const tenantPrisma = getTenantPrismaByUrl(tenant.databaseUrl);
    const feedback = await tenantPrisma.feedback.findFirst({
      where: { token: data.token, submittedAt: null },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Token inválido ou já utilizado" }, { status: 400 });
    }

    const updated = await tenantPrisma.feedback.update({
      where: { id: feedback.id },
      data: { rating: data.rating, comment: data.comment, submittedAt: new Date() },
    });

    return NextResponse.json(updated);
  }

  let prisma, tenantId;
  try {
    ({ prisma, tenantId } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = body;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const feedback = await prisma.feedback.create({
    data: { customerId },
  });

  const tenant = await masterPrisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const feedbackUrl = `${appUrl}/avaliacao/${tenant?.slug}/${feedback.token}`;
  const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl, { width: 300, margin: 2 });

  return NextResponse.json({ feedback, feedbackUrl, qrCodeDataUrl }, { status: 201 });
}
