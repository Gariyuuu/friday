import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { searchVideo } from "@/lib/intelligence/sources/video";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const results = await searchVideo(query);

  if (results === null) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY is not configured — video search is unavailable", results: [] },
      { status: 501 },
    );
  }

  return NextResponse.json({ results });
}
