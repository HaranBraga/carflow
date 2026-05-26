import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "NOT_INFORMED"]).default("NOT_INFORMED"),
  isUber: z.boolean().default(false),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const where = {
    tenantId,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        vehicles: { orderBy: { createdAt: "desc" } },
        _count: { select: { feedbacks: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return NextResponse.json({ customers, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const body = await req.json();
  const data = customerSchema.parse(body);

  const customer = await prisma.customer.create({
    data: { ...data, tenantId },
  });

  return NextResponse.json(customer, { status: 201 });
}
