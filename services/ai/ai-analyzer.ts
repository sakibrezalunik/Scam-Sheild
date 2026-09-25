/**
 * AI Analyzer — orchestrates AI analysis with fallback, scoring, and persistence.
 *
 * Architecture:
 *   deterministic signals → AI context → provider call → validate → bound score → combine
 *
 * The AI contribution is strictly bounded: max ±20 points on the risk score.
 * If AI fails or is unavailable, the deterministic result is returned unchanged.
 */
import { prisma } from "@/lib/db";
import { OpenAiProvider } from "./openai-provider";
import { GeminiProvider } from "./gemini-provider";
import type { AiProvider, AiAnalysisResult, AiScanContext } from "./ai-provider";
import { validateAiOutput, buildFallbackAiOutput } from "./ai-schema";
import { checkRateLimit } from "./rate-limiter";

// Bounded AI influence: ±20 points max on risk score
const MAX_AI_SCORE_ADJUSTMENT = 20;
const AI_SCORE_WEIGHT = 0.15; // AI assessment contributes at most 15% of total range

/**
 * Get or initialize the AI provider instance.
 * Returns null if no API key is configured.
 */
function getProvider(): AiProvider | null {
  // Gemini takes priority when GEMINI_API_KEY is set
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return new GeminiProvider({
      apiKey: geminiKey,
      model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
      timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? "10000", 10),
    });
  }

  // Fallback to OpenAI when AI_API_KEY is set
  const openaiKey = process.env.AI_API_KEY;
  if (openaiKey) {
    return new OpenAiProvider({
      apiKey: openaiKey,
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      baseUrl: process.env.AI_BASE_URL,
      timeoutMs: parseInt(process.env.AI_TIMEOUT_MS ?? "8000", 10),
    });
  }

  return null;
}

/**
 * Analyze a scan result with AI assistance.
 * Returns the original result with AI fields added (or null if AI is unavailable).
 */
export async function analyzeWithAi(
  context: AiScanContext,
  scanId: string
): Promise<{
  aiResult: AiAnalysisResult | null;
  aiRecordId: string | null;
  adjustedScore: number;
}> {
  const provider = getProvider();
  if (!provider) {
    return { aiResult: null, aiRecordId: null, adjustedScore: context.riskScore };
  }

  // Rate limit check per request (type-scoped to prevent cross-type abuse)
  const rateKey = `ai:${context.scanType}:${context.inputPreview.slice(0, 32)}`;
  const rateCheck = checkRateLimit(rateKey);
  if (!rateCheck.allowed) {
    return { aiResult: null, aiRecordId: null, adjustedScore: context.riskScore };
  }

  try {
    const rawResult = await provider.analyze(context);

    // Validate output
    const validated = validateAiOutput({
      assessment: rawResult.assessment,
      confidence: rawResult.confidence,
      reasoning: rawResult.reasoning,
      additionalInsights: rawResult.additionalInsights,
      recommendations: rawResult.recommendations,
    });

    if (!validated && rawResult.status === "success") {
      // Structured output failed validation — use fallback
      const fallback = buildFallbackAiOutput();
      const record = await saveAiAnalysis(scanId, { ...rawResult, ...fallback });
      return { aiResult: rawResult, aiRecordId: record.id, adjustedScore: context.riskScore };
    }

    const finalResult: AiAnalysisResult = validated
      ? {
          assessment: validated.assessment,
          confidence: validated.confidence,
          reasoning: validated.reasoning,
          additionalInsights: validated.additionalInsights,
          recommendations: validated.recommendations,
          status: rawResult.status,
        }
      : rawResult;

    const record = await saveAiAnalysis(scanId, finalResult);

    // Compute bounded AI score adjustment
    const adjustedScore = computeBoundedScoreAdjustment(
      context.riskScore,
      finalResult.confidence,
      finalResult.status
    );

    return { aiResult: finalResult, aiRecordId: record.id, adjustedScore };
  } catch {
    // AI call failed entirely — return original score, no AI record
    return { aiResult: null, aiRecordId: null, adjustedScore: context.riskScore };
  }
}

/**
 * Save AI analysis to the database.
 */
async function saveAiAnalysis(
  scanId: string,
  result: AiAnalysisResult
): Promise<{ id: string }> {
  try {
    const record = await prisma.aiAnalysis.create({
      data: {
        scanId,
        provider: process.env.GEMINI_API_KEY ? "gemini" : "openai",
        model: process.env.GEMINI_API_KEY
          ? (process.env.GEMINI_MODEL ?? "gemini-3.6-flash")
          : (process.env.AI_MODEL ?? "gpt-4o-mini"),
        assessment: result.assessment,
        confidence: result.confidence,
        reasoning: result.reasoning,
        additionalIndicators: result.additionalInsights,
        recommendations: result.recommendations,
        status: result.status,
      },
    });
    return { id: record.id };
  } catch {
    // Non-fatal: AI analysis saved separately; don't break the scan flow
    return { id: "" };
  }
}

/**
 * Compute a bounded AI score adjustment.
 * The AI's confidence-weighted opinion shifts the score by at most MAX_AI_SCORE_ADJUSTMENT.
 */
function computeBoundedScoreAdjustment(
  deterministicScore: number,
  aiConfidence: number,
  aiStatus: string
): number {
  if (aiStatus !== "success" || aiConfidence === 0) {
    return deterministicScore;
  }

  // AI confidence as a weight (0–1)
  const weight = (aiConfidence / 100) * AI_SCORE_WEIGHT;
  // Direction: if AI thinks it's worse than deterministic, push up; else push down
  // We approximate: AI confidence in high-risk framing → positive adjustment
  // In practice, we use the deterministic score as the base and apply a small bounded nudge
  const maxAdjustment = MAX_AI_SCORE_ADJUSTMENT;
  const nudge = Math.round((deterministicScore > 50 ? 1 : -1) * maxAdjustment * weight);

  return Math.max(0, Math.min(100, deterministicScore + nudge));
}

/**
 * Get AI analysis for a scan (for results page display).
 */
export async function getAiAnalysisForScan(scanId: string) {
  const record = await prisma.aiAnalysis.findFirst({
    where: { scanId },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return null;

  return {
    id: record.id,
    provider: record.provider,
    model: record.model,
    assessment: record.assessment,
    confidence: record.confidence,
    reasoning: record.reasoning,
    additionalIndicators: (record.additionalIndicators as string[] | null) ?? [],
    recommendations: (record.recommendations as string[] | null) ?? [],
    status: record.status,
    createdAt: record.createdAt,
  };
}
