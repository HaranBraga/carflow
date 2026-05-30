import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma, getTenantPrismaByUrl } from "@/lib/prisma-tenant";
import { masterPrisma } from "@/lib/prisma-master";
import { z } from "zod";
import QRCode from "qrcode";

const submitSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string().optional(),
  token: z.string(),
  tenantSlug: z.string(),
  birthdate: z.string().optional(),
  instagramFollowed: z.boolean().optional(),
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

  // Submissão pública via token
  if (body.token && body.rating !== undefined && body.tenantSlug) {
    const data = submitSchema.parse(body);

    const tenant = await masterPrisma.tenant.findUnique({ where: { slug: data.tenantSlug } });
    if (!tenant) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });

    const tenantPrisma = getTenantPrismaByUrl(tenant.databaseUrl);
    const feedback = await tenantPrisma.feedback.findFirst({
      where: { token: data.token, submittedAt: null },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Token inválido ou já utilizado" }, { status: 400 });
    }

    const birthdate = data.birthdate ? new Date(data.birthdate) : null;

    await tenantPrisma.feedback.update({
      where: { id: feedback.id },
      data: {
        rating: data.rating,
        comment: data.comment,
        birthdate: birthdate,
        instagramFollowed: data.instagramFollowed ?? false,
        submittedAt: new Date(),
      },
    });

    // Atualiza birthdate do cliente se fornecido
    if (birthdate) {
      await tenantPrisma.customer.update({
        where: { id: feedback.customerId },
        data: { birthdate },
      });
    }

    return NextResponse.json({ ok: true });
  }

  // Criação de feedback (autenticado) - via painel interno ou auto ao finalizar
  let prisma, tenantId;
  try {
    ({ prisma, tenantId } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId, orderId } = body;

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  // Evita duplicar feedback para o mesmo orderId
  if (orderId) {
    const existing = await prisma.feedback.findFirst({ where: { orderId } });
    if (existing) {
      const tenant = await masterPrisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const feedbackUrl = `${appUrl}/avaliacao/${tenant?.slug}/${existing.token}`;
      const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl, { width: 300, margin: 2 });
      return NextResponse.json({ feedback: existing, feedbackUrl, qrCodeDataUrl });
    }
  }

  const feedback = await prisma.feedback.create({
    data: { customerId, orderId: orderId || null },
  });

  const tenant = await masterPrisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const feedbackUrl = `${appUrl}/avaliacao/${tenant?.slug}/${feedback.token}`;
  const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl, { width: 300, margin: 2 });

  return NextResponse.json({ feedback, feedbackUrl, qrCodeDataUrl }, { status: 201 });
}
