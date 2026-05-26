import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import QRCode from "qrcode";

const feedbackSchema = z.object({
  rating: z.number().min(0).max(5),
  comment: z.string().optional(),
  token: z.string(),
});

// GET: buscar feedbacks do tenant (autenticado)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  const feedbacks = await prisma.feedback.findMany({
    where: { tenantId, ...(customerId ? { customerId } : {}) },
    include: { customer: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(feedbacks);
}

// POST: criar token de feedback para cliente (autenticado) ou submeter avaliação (público via token)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Submissão pública via token
  if (body.token && body.rating !== undefined) {
    const data = feedbackSchema.parse(body);

    const feedback = await prisma.feedback.findFirst({
      where: { token: data.token, submittedAt: null },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Token inválido ou já utilizado" }, { status: 400 });
    }

    const updated = await prisma.feedback.update({
      where: { id: feedback.id },
      data: { rating: data.rating, comment: data.comment, submittedAt: new Date() },
    });

    return NextResponse.json(updated);
  }

  // Criação de feedback (autenticado)
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { customerId } = body;

  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  const feedback = await prisma.feedback.create({
    data: { tenantId, customerId },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const feedbackUrl = `${appUrl}/avaliacao/${feedback.token}`;
  const qrCodeDataUrl = await QRCode.toDataURL(feedbackUrl, { width: 300, margin: 2 });

  return NextResponse.json({ feedback, feedbackUrl, qrCodeDataUrl }, { status: 201 });
}
