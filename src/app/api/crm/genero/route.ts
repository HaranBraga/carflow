import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = (session.user as any).tenantId;

  const data = await prisma.$queryRaw<any[]>`
    SELECT gender, COUNT(id) as count
    FROM customers
    WHERE "tenantId" = ${tenantId}
    GROUP BY gender
    ORDER BY count DESC
  `;

  return NextResponse.json(data.map((r) => ({ ...r, count: Number(r.count) })));
}
