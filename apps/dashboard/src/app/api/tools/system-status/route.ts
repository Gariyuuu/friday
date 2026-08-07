import "server-only";
import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const execFileAsync = promisify(execFile);
const logger = createLogger("TOOL");

async function readBattery() {
  try {
    const { stdout } = await execFileAsync("pmset", ["-g", "batt"], { timeout: 3000 });
    const percentMatch = /(\d+)%/.exec(stdout);
    const charging = /AC Power/.test(stdout) && !/discharging/i.test(stdout);
    return {
      percent: percentMatch ? Number(percentMatch[1]) : null,
      charging,
    };
  } catch {
    return { percent: null, charging: null };
  }
}

export async function GET() {
  try {
    const battery = await readBattery();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return NextResponse.json({
      cpuLoadAvg1m: os.loadavg()[0],
      cpuCount: os.cpus().length,
      memoryUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      memoryTotalGb: Math.round((totalMem / 1024 ** 3) * 10) / 10,
      battery,
      platform: os.platform(),
      uptimeHours: Math.round((os.uptime() / 3600) * 10) / 10,
    });
  } catch (error) {
    logger.error("failed to read system status", { error: String(error) });
    return NextResponse.json({ error: "failed to read system status" }, { status: 500 });
  }
}
