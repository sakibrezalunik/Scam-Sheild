import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";

/**
 * GET /api/dashboard/scans?page=1&type=url&limit=10
 * Returns paginated scans owned by the authenticated user.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
  const type = searchParams.get("type") || "";
  const riskLevel = searchParams.get("riskLevel") || "";

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: user.id };
  if (type === "url") where.scanType = "url";
  else if (type === "message") where.scanType = "message";
  else if (type === "job") where.scanType = "job";
  if (riskLevel) where.riskLevel = riskLevel;

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      select: {
        id: true,
        scanType: true,
        inputPreview: true,
        riskScore: true,
        riskLevel: true,
        category: true,
        summary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.scan.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      scans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
}
