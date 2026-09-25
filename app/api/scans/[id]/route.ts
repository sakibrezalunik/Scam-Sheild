import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/middleware";
import { getAiAnalysisForScan } from "@/services/ai/ai-analyzer";
import { logger } from "@/lib/logger";

/**
 * GET /api/scans/[id]
 * Returns a scan record by ID with its related indicators and analysis data.
 * Strips userId and inputHash before returning. Enforces ownership for authenticated scans.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { success: false, error: { message: "Invalid scan ID format" } },
        { status: 400 }
      );
    }

    const scan = await prisma.scan.findUnique({
      where: { id },
      include: {
        indicators: {
          orderBy: { severity: "asc" },
        },
        urlAnalysis: true,
        msgAnalysis: true,
        jobAnalysis: true,
      },
    });

    if (!scan) {
      return NextResponse.json(
        { success: false, error: { message: "Scan not found" } },
        { status: 404 }
      );
    }

    // Ownership check: if scan has a userId (authenticated), only the owner can view it
    if (scan.userId) {
      const currentUser = await getSessionUser();
      if (!currentUser || currentUser.id !== scan.userId) {
        return NextResponse.json(
          { success: false, error: { message: "Access denied" } },
          { status: 403 }
        );
      }
    }

    // Strip sensitive fields before returning
    const { userId, inputHash, ...safeScan } = scan;
    void userId;
    void inputHash;

    // Fetch AI analysis
    const aiAnalysis = await getAiAnalysisForScan(id);

    return NextResponse.json({ success: true, data: { ...safeScan, aiAnalysis } });
  } catch (error) {
    logger.error("Error fetching scan", { error: String(error) });
    return NextResponse.json(
      { success: false, error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
