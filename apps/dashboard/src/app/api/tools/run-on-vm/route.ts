import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import { assertPublicUrl, SsrfBlockedError } from "@/lib/vm/ssrf-guard";
import { runVmTask } from "@/lib/vm/vm-client";

const logger = createLogger("TOOL");

const BrowseStepSchema = z.object({
  action: z.enum(["click", "type", "wait", "screenshot"]),
  selector: z.string().min(1).max(500).optional(),
  text: z.string().max(2000).optional(),
  timeoutMs: z.number().int().min(1).max(20000).optional(),
});

const RequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("browse"),
    url: z
      .string()
      .url()
      .refine((u) => ["http:", "https:"].includes(new URL(u).protocol), {
        message: "only http/https URLs may be browsed",
      }),
    steps: z.array(BrowseStepSchema).max(10).optional(),
    timeoutSeconds: z.number().int().min(1).max(120).optional(),
  }),
  z.object({
    type: z.literal("shell").optional(),
    command: z.string().min(1).max(4000),
    timeoutSeconds: z.number().int().min(1).max(120).optional(),
    allowNetwork: z.boolean().optional(),
  }),
]);

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  // App-layer SSRF backstop, in addition to (not instead of) the VM-side
  // DOCKER-USER iptables block — see docs/SECURITY.md. Two independent layers.
  if (parsed.data.type === "browse") {
    try {
      await assertPublicUrl(parsed.data.url);
    } catch (error) {
      if (error instanceof SsrfBlockedError) {
        logger.error("blocked browse_on_vm SSRF attempt", { url: parsed.data.url, error: error.message });
        return NextResponse.json({ error: `blocked: ${error.message}` }, { status: 400 });
      }
      throw error;
    }
  }

  const result = await runVmTask(parsed.data);
  logger.info("ran vm task", { type: parsed.data.type ?? "shell", ok: result.ok });
  return NextResponse.json(result);
}
