import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const execFileAsync = promisify(execFile);
const logger = createLogger("TOOL");

export async function GET() {
  try {
    const { stdout } = await execFileAsync(
      "osascript",
      ["-e", "output volume of (get volume settings)"],
      { timeout: 3000 },
    );
    return NextResponse.json({ level: Number(stdout.trim()) });
  } catch (error) {
    logger.error("failed to read volume", { error: String(error) });
    return NextResponse.json({ error: "failed to read volume" }, { status: 500 });
  }
}

const RequestSchema = z.object({ level: z.number().int().min(0).max(100) });

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "level must be an integer 0-100" }, { status: 400 });
  }

  try {
    // Level is a validated integer, never a raw string, so it's safe to interpolate
    // into the AppleScript source passed as a single execFile argument.
    await execFileAsync(
      "osascript",
      ["-e", `set volume output volume ${parsed.data.level}`],
      { timeout: 3000 },
    );
    logger.info("set volume", { level: parsed.data.level });
    return NextResponse.json({ ok: true, level: parsed.data.level });
  } catch (error) {
    logger.error("failed to set volume", { error: String(error) });
    return NextResponse.json({ error: "failed to set volume" }, { status: 500 });
  }
}
