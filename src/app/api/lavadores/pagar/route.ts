import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const paymentItemSchema = z.object({
  washerId: z.string(),
  days: z.number().min(0.5).max(31),
  dailyRate: z.number().min(0),
  bonus: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const schema = z.object({
  payments: z.array(paymentItemSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { payments } = schema.parse(await req.json());

  const washerIds = payments.map((p) => p.washerId);
  const washers = await prisma.washer.findMany({
    where: { id: { in: washerIds } },
    select: { id: true, name: true },
  });
  const washerMap = new Map(washers.map((w) => [w.id, w.name]));

  const results = [];
  for (const p of payments) {
    const amount = p.days * p.dailyRate + p.bonus;
    if (amount <= 0) continue;

    const washerName = washerMap.get(p.washerId) || "Lavador";
    const daysLabel = p.days === 1 ? "1 dia" : `${p.days} dias`;
    const bonusLabel = p.bonus > 0
      ? ` + bônus R$${p.bonus.toFixed(2).replace(".", ",")}`
      : "";
    const description = `${washerName} — ${daysLabel}${bonusLabel}`;

    const cashFlow = await prisma.cashFlow.create({
      data: {
        type: "EXPENSE",
        category: "Diária Lavador",
        expenseType: "DIARIA",
        description,
        amount,
      },
    });

    const payment = await prisma.washerPayment.create({
      data: {
        washerId: p.washerId,
        amount,
        days: p.days,
        bonus: p.bonus,
        notes: p.notes,
        cashFlowId: cashFlow.id,
      },
    });

    results.push({ payment, cashFlow });
  }

  const totalPaid = results.reduce((sum, r) => sum + Number(r.payment.amount), 0);

  return NextResponse.json({ success: true, count: results.length, totalPaid }, { status: 201 });
}
