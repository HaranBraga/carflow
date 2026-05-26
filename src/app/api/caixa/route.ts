import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startOfDay, endOfDay } from "date-fns";

const cashFlowSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string(),
  description: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const date = new Date(dateStr);

  const where = {
    tenantId,
    date: { gte: startOfDay(date), lte: endOfDay(date) },
  };

  const [entries, income, expense] = await Promise.all([
    prisma.cashFlow.findMany({
      where,
      orderBy: { date: "asc" },
    }),
    prisma.cashFlow.aggregate({ where: { ...where, type: "INCOME" }, _sum: { amount: true } }),
    prisma.cashFlow.aggregate({ where: { ...where, type: "EXPENSE" }, _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    entries,
    totalIncome: Number(income._sum.amount ?? 0),
    totalExpense: Number(expense._sum.amount ?? 0),
    balance: Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const body = await req.json();
  const data = cashFlowSchema.parse(body);

  const entry = await prisma.cashFlow.create({
    data: { ...data, tenantId },
  });

  return NextResponse.json(entry, { status: 201 });
}
