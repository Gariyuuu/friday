export type LogCategory =
  | "VOICE"
  | "AI"
  | "TOOL"
  | "VM"
  | "NETWORK"
  | "UI"
  | "SECURITY";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SECRET_KEY_PATTERN = /(key|token|secret|password|authorization)/i;

/** Recursively masks likely-secret values so logs are safe even if a caller passes raw config. */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[max-depth]";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((entry) => redact(entry, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        if (SECRET_KEY_PATTERN.test(key) && typeof val === "string") {
          return [key, val.length > 0 ? "[redacted]" : val];
        }
        return [key, redact(val, depth + 1)];
      }),
    );
  }
  return value;
}

export interface LoggerOptions {
  minLevel?: LogLevel;
}

export function createLogger(category: LogCategory, options: LoggerOptions = {}) {
  const minLevel = options.minLevel ?? "info";

  function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[minLevel]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...(context ? { context: redact(context) } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      emit("debug", message, context),
    info: (message: string, context?: Record<string, unknown>) =>
      emit("info", message, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      emit("warn", message, context),
    error: (message: string, context?: Record<string, unknown>) =>
      emit("error", message, context),
  };
}
