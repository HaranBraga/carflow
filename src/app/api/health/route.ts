import { NextResponse } from "next/server";
import { masterPrisma } from "@/lib/prisma-master";

export async function GET() {
  try {
    await masterPrisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected" });
  } catch {
    return NextResponse.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
