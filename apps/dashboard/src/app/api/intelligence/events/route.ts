import { NextResponse } from "next/server";
import { getIntelligenceProvider } from "@/lib/intelligence";

export async function GET() {
  const snapshot = await getIntelligenceProvider().getEvents();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
