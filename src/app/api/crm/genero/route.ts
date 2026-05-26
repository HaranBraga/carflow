import { NextResponse } from "next/server";
import { getTenantPrisma } from "@/lib/prisma-tenant";

export async function GET() {
  let prisma;
  try {
    ({ prisma } = await getTenantPrisma());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await prisma.$queryRaw<any[]>`
    SELECT gender, COUNT(id) as count
    FROM customers
    GROUP BY gender
    ORDER BY count DESC
  `;

  return NextResponse.json(data.map((r) => ({ ...r, count: Number(r.count) })));
}
