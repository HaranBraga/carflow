import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  type: z.enum(["INCOME", "EXPENSE"]),
});

export async function GET() {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const cats = await prisma.cashFlowCategory.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const data = schema.parse(await req.json());
  const cat = await prisma.cashFlowCategory.create({ data });
  return NextResponse.json(cat, { status: 201 });
}
