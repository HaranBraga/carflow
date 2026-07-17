import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(["INCOME", "EXPENSE"]),
  expenseType: z.enum(["MENSAL", "DIARIA", "INSUMOS"]).optional(),
});

export async function GET() {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const cats = await prisma.cashFlowCategory.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const data = schema.parse(await req.json());
  const cat = await prisma.cashFlowCategory.create({
    data: {
      name: data.name,
      type: data.type,
      expenseType: data.type === "EXPENSE" ? (data.expenseType ?? null) : null,
    },
  });
  return NextResponse.json(cat, { status: 201 });
}
