import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const execFileAsync = promisify(execFile);
const logger = createLogger("TOOL");

const RequestSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
});

/** Escapes for use inside a double-quoted AppleScript string literal. */
function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const title = escapeAppleScriptString(parsed.data.title);
  const body = escapeAppleScriptString(parsed.data.body);
  const script = `display notification "${body}" with title "${title}"`;

  try {
    await execFileAsync("osascript", ["-e", script], { timeout: 3000 });
    logger.info("showed notification", { title: parsed.data.title });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("failed to show notification", { error: String(error) });
    return NextResponse.json({ error: "failed to show notification" }, { status: 500 });
  }
}
