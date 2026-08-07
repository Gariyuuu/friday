import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const execFileAsync = promisify(execFile);
const logger = createLogger("TOOL");

const RequestSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => ["http:", "https:"].includes(new URL(u).protocol), {
      message: "only http/https URLs may be opened",
    }),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  try {
    await execFileAsync("open", [parsed.data.url], { timeout: 5000 });
    logger.info("opened url", { url: parsed.data.url });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("failed to open url", { error: String(error) });
    return NextResponse.json({ error: "failed to open url" }, { status: 500 });
  }
}
