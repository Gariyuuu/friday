import { NextResponse } from "next/server";
import { getIntelligenceProvider } from "@/lib/intelligence";

export async function GET() {
  const snapshot = await getIntelligenceProvider().getMarkets();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "s-maxage=20, stale-while-revalidate=10" },
  });
}
