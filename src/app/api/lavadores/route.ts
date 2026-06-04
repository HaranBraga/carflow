import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const washerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  cpf: z.string().optional(),
  dailyRate: z.number().positive().optional(),
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
        take: 3,
        select: { id: true, amount: true, days: true, bonus: true, date: true, notes: true },
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

  const data = washerSchema.parse(await req.json());
  const washer = await prisma.washer.create({ data });

  return NextResponse.json(washer, { status: 201 });
}
