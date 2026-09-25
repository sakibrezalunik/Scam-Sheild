import { NextRequest, NextResponse } from "next/server";
import { analyzeJob } from "@/services/scanner/job-scanner";
import { validateJobInput } from "@/services/security/input-validator";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/middleware";
import { getAiAnalysisForScan } from "@/services/ai/ai-analyzer";
import { checkRateLimit, getClientIp } from "@/services/security/rate-limiter";
import { logger } from "@/lib/logger";
import { RATE_LIMITS } from "@/lib/utils/constants";

export async function POST(request: NextRequest) {
  try {
    // Rate limit check
    const user = await getSessionUser();
    const rateKey = user ? `scan:user:${user.id}` : `scan:ip:${getClientIp(request)}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: { code: "RATE_LIMITED", message: "Too many scan requests. Please wait and try again." } },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.retryAfterMs ?? 60000) / 1000)), ...(rateCheck.headers ?? {}) } }
      );
    }

    const body = await request.json();
    const { jobDescription } = body;

    // Validate input
    const validation = validateJobInput(jobDescription);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: validation.error } },
        { status: 400 }
      );
    }

    // Analyze job (all server-side — never trust client-provided scores or ownership)
    const result = await analyzeJob(validation.data);

    // Get user ID from session only
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || undefined;

    // Monthly quota enforcement for authenticated users
    if (userId) {
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        return NextResponse.json(
          { success: false, error: { code: "AUTH_ERROR", message: "User not found" } },
          { status: 401 }
        );
      }

      const tierKey = currentUser.subscriptionTier.toUpperCase() as "FREE" | "PRO" | "BUSINESS";
      const limit = RATE_LIMITS[tierKey]?.scansPerMonth ?? RATE_LIMITS.FREE.scansPerMonth;

      // Monthly reset logic
      let used = currentUser.monthlyScansUsed;
      let resetAt: string | undefined;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (used >= limit && currentUser.lastScanReset < thirtyDaysAgo) {
        await prisma.user.update({
          where: { id: userId },
          data: { monthlyScansUsed: 0, lastScanReset: new Date() },
        });
        used = 0;
        resetAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        resetAt = new Date(currentUser.lastScanReset.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (used >= limit) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "QUOTA_EXCEEDED",
              message: "Monthly scan limit reached. Upgrade your plan for more scans.",
              limit,
              used,
              resetAt,
            },
          },
          { status: 429, headers: rateCheck.headers ?? {} }
        );
      }
    }

    // Save to database
    const scan = await prisma.scan.create({
      data: {
        userId,
        scanType: "job",
        inputHash: result.inputHash,
        inputPreview: result.inputPreview,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        category: result.category,
        summary: result.summary,
        indicators: {
          create: result.indicators.map((ind) => ({
            severity: ind.severity,
            category: ind.category,
            title: ind.title,
            description: ind.description,
            evidence: ind.evidence,
          })),
        },
        jobAnalysis: result.jobAnalysis
          ? {
              create: {
                companyName: result.jobAnalysis.companyName,
                jobTitle: result.jobAnalysis.jobTitle,
                recruiterName: result.jobAnalysis.recruiterName,
                recruiterEmail: result.jobAnalysis.recruiterEmail,
                recruiterPhone: result.jobAnalysis.recruiterPhone,
                salaryRange: result.jobAnalysis.salaryRange,
                location: result.jobAnalysis.location,
                remoteStatus: result.jobAnalysis.remoteStatus,
                employmentType: result.jobAnalysis.employmentType,
                jobType: result.jobAnalysis.jobType,
                contactMethod: result.jobAnalysis.contactMethod,
                applicationMethod: result.jobAnalysis.applicationMethod,
                extractedUrls: result.jobAnalysis.extractedUrls,
                extractedEmails: result.jobAnalysis.extractedEmails,
                extractedPhones: result.jobAnalysis.extractedPhones,
                redFlags: result.jobAnalysis.redFlags,
                positiveSignals: result.jobAnalysis.positiveSignals,
                category: result.jobAnalysis.category,
                urlAnalysisResults: result.jobAnalysis.urlAnalysisResults,
              },
            }
          : undefined,
      },
      include: {
        indicators: true,
        jobAnalysis: true,
      },
    });

    // Increment monthly counter for authenticated users
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { monthlyScansUsed: { increment: 1 } },
      });
    }

    // Fetch AI analysis (non-blocking — scan already saved)
    const aiAnalysis = await getAiAnalysisForScan(scan.id);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        id: scan.id,
        aiAnalysis,
      },
    }, { headers: rateCheck.headers ?? {} });
  } catch (error) {
    logger.error("Job scan error", { error: String(error) });
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "An error occurred while analyzing the job posting" } },
      { status: 500 }
    );
  }
}
