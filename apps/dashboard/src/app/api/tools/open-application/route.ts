import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { APP_ALLOWLIST } from "@/lib/tools/registry";

const execFileAsync = promisify(execFile);
const logger = createLogger("TOOL");

const RequestSchema = z.object({ appName: z.enum(APP_ALLOWLIST) });

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "app not in allowlist" }, { status: 400 });
  }

  try {
    // execFile with an argument array — never shell-interpolated, and appName is
    // constrained by the Zod enum to the exact allowlist above.
    await execFileAsync("open", ["-a", parsed.data.appName], { timeout: 5000 });
    logger.info("opened application", { appName: parsed.data.appName });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("failed to open application", { error: String(error) });
    return NextResponse.json({ error: "failed to launch application" }, { status: 500 });
  }
}
