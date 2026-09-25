import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/stats
 * Returns aggregate platform statistics for the admin overview.
 * Requires admin authorization.
 */
export async function GET() {
  const admin = await requireAdmin();
  if ("status" in admin) return admin;

  const [
    totalUsers,
    totalScans,
    urlScans,
    messageScans,
    jobScans,
    adminUsers,
    recentScans,
    riskDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.scan.count(),
    prisma.scan.count({ where: { scanType: "url" } }),
    prisma.scan.count({ where: { scanType: "message" } }),
    prisma.scan.count({ where: { scanType: "job" } }),
    prisma.user.count({ where: { role: "admin" } }),
    prisma.scan.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.scan.groupBy({
      by: ["riskLevel"],
      _count: true,
    }),
  ]);

  // Build a map of risk level → count for easy lookup
  const riskMap: Record<string, number> = {};
  for (const bucket of riskDistribution) {
    riskMap[bucket.riskLevel ?? "unknown"] = bucket._count;
  }

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      totalScans,
      urlScans,
      messageScans,
      jobScans,
      adminUsers,
      recent24hScans: recentScans,
      riskDistribution: {
        minimal: riskMap.minimal ?? 0,
        low: riskMap.low ?? 0,
        moderate: riskMap.moderate ?? 0,
        high: riskMap.high ?? 0,
        critical: riskMap.critical ?? 0,
      },
    },
  });
}
