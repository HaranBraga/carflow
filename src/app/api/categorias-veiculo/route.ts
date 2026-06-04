import { NextRequest, NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function GET() {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const types = await prisma.vehicleType.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(types.map((t) => ({ category: t.key, label: t.label })));
}

export async function PUT(req: NextRequest) {
  let prisma;
  try { ({ prisma } = await getTenantPrisma()); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const updates: { category: string; label: string }[] = await req.json();

  for (const { category, label } of updates) {
    await prisma.vehicleType.updateMany({
      where: { key: category },
      data: { label },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
