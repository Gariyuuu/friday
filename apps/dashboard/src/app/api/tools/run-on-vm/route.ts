import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { runVmTask } from "@/lib/vm/vm-client";

const logger = createLogger("TOOL");

const RequestSchema = z.object({
  command: z.string().min(1).max(4000),
  timeoutSeconds: z.number().int().min(1).max(120).optional(),
  allowNetwork: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const result = await runVmTask(parsed.data);
  logger.info("ran vm task", { ok: result.ok, exitCode: result.exitCode });
  return NextResponse.json(result);
}
