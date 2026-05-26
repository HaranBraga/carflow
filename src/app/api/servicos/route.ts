import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  categoryId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const services = await prisma.service.findMany({
    where: { tenantId, active: true },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const body = await req.json();
  const data = serviceSchema.parse(body);

  const service = await prisma.service.create({
    data: { ...data, tenantId },
  });

  return NextResponse.json(service, { status: 201 });
}
