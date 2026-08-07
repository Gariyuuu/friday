import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { addMemory, clearMemories, deleteMemory, listMemories, searchMemories } from "@/lib/memory/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const results = q ? searchMemories(q) : listMemories();
  return NextResponse.json({ memories: results });
}

const AddSchema = z.object({
  category: z.enum(["preference", "project", "episodic"]),
  content: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const parsed = AddSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "category and content are required" }, { status: 400 });
  }
  const record = addMemory(parsed.data.category, parsed.data.content);
  return NextResponse.json({ memory: record });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const category = request.nextUrl.searchParams.get("category");

  if (id) {
    deleteMemory(id);
    return NextResponse.json({ ok: true });
  }
  if (category === "preference" || category === "project" || category === "episodic") {
    clearMemories(category);
    return NextResponse.json({ ok: true });
  }
  if (category === "all") {
    clearMemories();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id or category is required" }, { status: 400 });
}
