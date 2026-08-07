import { NextResponse } from "next/server";
import { getIntelligenceProvider } from "@/lib/intelligence";

export async function GET() {
  const snapshot = await getIntelligenceProvider().getWeatherAlerts();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "s-maxage=180, stale-while-revalidate=60" },
  });
}
