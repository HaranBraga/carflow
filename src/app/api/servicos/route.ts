import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  categoryId: z.string().optional(),
});

export async function GET() {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = serviceSchema.parse(body);

  const service = await prisma.service.create({ data });

  return NextResponse.json(service, { status: 201 });
}
