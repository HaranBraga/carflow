import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const cashFlowSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string(),
  categoryId: z.string().optional(),
  description: z.string(),
  amount: z.number().positive(),
  expenseType: z.enum(["MENSAL", "DIARIA", "INSUMOS"]).optional(),
});

function buildDateRange(dateStr: string, period: string) {
  if (period === "month") {
    const [year, month] = dateStr.split("-").map(Number);
    return {
      gte: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
      lte: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
    };
  }
  // day (default) — use explicit UTC boundaries to avoid server timezone issues
  return {
    gte: new Date(dateStr + "T00:00:00.000Z"),
    lte: new Date(dateStr + "T23:59:59.999Z"),
  };
}

export async function GET(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "day";
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const dateRange = buildDateRange(dateStr, period);
  const where = { date: dateRange };

  const [entries, income, expense, expenseGroups] = await Promise.all([
    prisma.cashFlow.findMany({ where, orderBy: { date: "asc" } }),
    prisma.cashFlow.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.cashFlow.aggregate({
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.cashFlow.groupBy({
      by: ["expenseType"],
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const expenseBreakdown: Record<string, number> = {
    MENSAL: 0,
    DIARIA: 0,
    INSUMOS: 0,
    OUTRO: 0,
  };
  for (const g of expenseGroups) {
    const key = g.expenseType ?? "OUTRO";
    expenseBreakdown[key] = Number(g._sum.amount ?? 0);
  }

  return NextResponse.json({
    entries,
    totalIncome: Number(income._sum.amount ?? 0),
    totalExpense: Number(expense._sum.amount ?? 0),
    balance: Number(income._sum.amount ?? 0) - Number(expense._sum.amount ?? 0),
    expenseBreakdown,
    period,
    dateStr,
  });
}

export async function POST(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = cashFlowSchema.parse(body);

  // Auto-propagate expenseType from linked category if not explicitly provided
  let expenseType = data.expenseType ?? null;
  if (!expenseType && data.type === "EXPENSE" && data.categoryId) {
    const cat = await prisma.cashFlowCategory.findUnique({
      where: { id: data.categoryId },
      select: { expenseType: true },
    });
    expenseType = cat?.expenseType ?? null;
  }

  const entry = await prisma.cashFlow.create({
    data: {
      type: data.type,
      category: data.category,
      categoryId: data.categoryId,
      description: data.description,
      amount: data.amount,
      expenseType,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
