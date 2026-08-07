import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { searchWeb } from "@/lib/intelligence/sources/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const depth = request.nextUrl.searchParams.get("depth");
  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const results = await searchWeb(
    query,
    depth === "quick" || depth === "deep" ? depth : "standard",
  );

  if (results === null) {
    return NextResponse.json(
      { error: "SEARCH_API_KEY is not configured — web search is unavailable", results: [] },
      { status: 501 },
    );
  }

  return NextResponse.json({ results });
}
