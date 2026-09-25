import { NextResponse } from "next/server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  const info: Record<string, unknown> = {};

  // Check environment variables
  info["PRISMA_QUERY_ENGINE_BINARY"] = process.env.PRISMA_QUERY_ENGINE_BINARY ?? "(not set)";
  info["PRISMA_QUERY_ENGINE_LIBRARY"] = process.env.PRISMA_QUERY_ENGINE_LIBRARY ?? "(not set)";
  info["NEXT_RUNTIME"] = process.env.NEXT_RUNTIME ?? "(not set)";
  info["VERCEL"] = process.env.VERCEL ?? "(not set)";
  info["VERCEL_URL"] = process.env.VERCEL_URL ?? "(not set)";
  info["LAMBDA_TASK_ROOT"] = process.env.LAMBDA_TASK_ROOT ?? "(not set)";
  info["LAMBDA_RUNTIME_DIR"] = process.env.LAMBDA_RUNTIME_DIR ?? "(not set)";
  info["PATH"] = process.env.PATH ?? "(not set)";

  // Test: is /ROOT a symlink?
  (info as Record<string, unknown>)["/ROOT symlink"] = (() => {
    try {
      const stats = statSync("/ROOT");
      return { isSymlink: stats.isSymbolicLink(), target: "check via readlink" };
    } catch {
      return "error reading /ROOT";
    }
  })();

  // Check if /ROOT is /var/task
  (info as Record<string, unknown>)["/ROOT exists"] = existsSync("/ROOT");
  (info as Record<string, unknown>)["/ROOT is symlink"] = (() => {
    try {
      return statSync("/ROOT").isSymbolicLink();
    } catch {
      return false;
    }
  })();

  // Test: can we stat /ROOT/generated/prisma?
  const rootPrismaPath = join("/ROOT", "generated", "prisma", "libquery_engine-rhel-openssl-3.0.x.so.node");
  (info as Record<string, unknown>)["/ROOT/generated/prisma binary"] = {
    exists: existsSync(rootPrismaPath),
    size: existsSync(rootPrismaPath) ? statSync(rootPrismaPath).size : 0,
  };

  // Test: can we stat /var/task/generated/prisma?
  const taskPrismaPath = join("/var/task", "generated", "prisma", "libquery_engine-rhel-openssl-3.0.x.so.node");
  (info as Record<string, unknown>)["/var/task/generated/prisma binary"] = {
    exists: existsSync(taskPrismaPath),
    size: existsSync(taskPrismaPath) ? statSync(taskPrismaPath).size : 0,
  };

  // Test: list files in /ROOT/generated/prisma/
  try {
    const { readdirSync } = await import("node:fs");
    const rootGen = join("/ROOT", "generated", "prisma");
    if (existsSync(rootGen)) {
      (info as Record<string, unknown>)["/ROOT/generated/prisma contents"] = readdirSync(rootGen);
    } else {
      (info as Record<string, unknown>)["/ROOT/generated/prisma contents"] = "directory does not exist";
    }
  } catch (e: unknown) {
    (info as Record<string, unknown>)["/ROOT/generated/prisma contents"] = String(e);
  }

  // Test: list files in /var/task/generated/prisma/
  try {
    const { readdirSync } = await import("node:fs");
    const taskGen = join("/var/task", "generated", "prisma");
    if (existsSync(taskGen)) {
      (info as Record<string, unknown>)["/var/task/generated/prisma contents"] = readdirSync(taskGen);
    } else {
      (info as Record<string, unknown>)["/var/task/generated/prisma contents"] = "directory does not exist";
    }
  } catch (e: unknown) {
    (info as Record<string, unknown>)["/var/task/generated/prisma contents"] = String(e);
  }

  // Test: try to require the binary
  try {
    const binaryPath = process.env.PRISMA_QUERY_ENGINE_BINARY;
    if (binaryPath && existsSync(binaryPath)) {
      // We can't actually require() a .so.node file in a way that tells us much,
      // but we can at least verify it's readable
      const stats = statSync(binaryPath);
      (info as Record<string, unknown>)["binary_readable"] = {
        size: stats.size,
        mode: stats.mode,
      };
    } else {
      (info as Record<string, unknown>)["binary_readable"] = "env var not set or path does not exist";
    }
  } catch (e: unknown) {
    (info as Record<string, unknown>)["binary_readable"] = String(e);
  }

  // List all env vars containing "engine" or "binary" (case insensitive)
  const engineVars: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.toLowerCase().includes("engine") || k.toLowerCase().includes("binary")) {
      engineVars[k] = v ?? "(empty)";
    }
  }
  (info as Record<string, unknown>)["engine_vars"] = engineVars;

  return NextResponse.json(info);
}
