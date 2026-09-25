import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Public health check — no auth required, no sensitive data exposed.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "unknown",
  });
}
