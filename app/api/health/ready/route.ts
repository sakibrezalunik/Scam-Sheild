import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health/ready
 * Readiness probe — checks DB connectivity.
 * Returns 200 if ready, 503 if not.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "not_ready", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
