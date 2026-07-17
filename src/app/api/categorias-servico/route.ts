import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { z } from "zod";

const schema = z.object({ name: z.string().min(2) });

export async function GET() {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const cats = await prisma.serviceCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(cats);
}

export async function POST(req: NextRequest) {
  try { await requireAuth(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { name } = schema.parse(await req.json());
  const cat = await prisma.serviceCategory.create({ data: { name } });
  return NextResponse.json(cat, { status: 201 });
}
