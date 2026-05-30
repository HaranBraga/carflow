import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const schema = z.object({ name: z.string().min(2) });

export async function GET() {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const cats = await prisma.serviceCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { name } = schema.parse(await req.json());
  const cat = await prisma.serviceCategory.create({ data: { name } });
  return NextResponse.json(cat, { status: 201 });
}
