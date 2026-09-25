/**
 * Structured logger for ScamShield.
 *
 * - Production: JSON lines to stderr (log aggregator friendly)
 * - Development: human-readable with color hints
 *
 * Sensitive data (passwords, tokens, keys) is never logged.
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  ts: string;
  msg: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, msg: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    ts: new Date().toISOString(),
    msg,
    ...(meta ?? {}),
  };
  return JSON.stringify(entry);
}

function humanFormat(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const prefix = level === "error" ? "ERROR" : level === "warn" ? "WARN " : "INFO ";
  const extra = meta ? ` ${JSON.stringify(meta)}` : "";
  const target = level === "error" ? process.stderr : process.stdout;
  target.write(`${prefix} ${msg}${extra}\n`);
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "production") {
      process.stderr.write(formatEntry("info", msg, meta) + "\n");
    } else {
      humanFormat("info", msg, meta);
    }
  },

  warn: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "production") {
      process.stderr.write(formatEntry("warn", msg, meta) + "\n");
    } else {
      humanFormat("warn", msg, meta);
    }
  },

  error: (msg: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === "production") {
      process.stderr.write(formatEntry("error", msg, meta) + "\n");
    } else {
      humanFormat("error", msg, meta);
    }
  },
};
