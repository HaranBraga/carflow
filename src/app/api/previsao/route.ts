import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentWeather } from "@/lib/weather";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weather = await getCurrentWeather();
  if (!weather) return NextResponse.json({ error: "Weather unavailable" }, { status: 503 });

  return NextResponse.json(weather, {
    headers: { "Cache-Control": "public, max-age=1800" }, // cache 30min
  });
}
