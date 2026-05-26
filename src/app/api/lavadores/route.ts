import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const washerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  cpf: z.string().optional(),
});

const paymentSchema = z.object({
  washerId: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export async function GET() {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const washers = await prisma.washer.findMany({
    where: { active: true },
    include: {
      _count: { select: { orders: true, payments: true } },
      payments: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(washers);
}

export async function POST(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.action === "pay") {
    const { washerId, amount, notes } = paymentSchema.parse(body);

    const payment = await prisma.washerPayment.create({
      data: { washerId, amount, notes },
    });

    await prisma.cashFlow.create({
      data: {
        type: "EXPENSE",
        category: "Lavador",
        description: notes || `Pagamento lavador`,
        amount,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  }

  const data = washerSchema.parse(body);
  const washer = await prisma.washer.create({ data });

  return NextResponse.json(washer, { status: 201 });
}
