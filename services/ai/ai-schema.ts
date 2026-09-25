/**
 * Zod schemas for validating AI analysis output.
 * Ensures AI responses conform to expected structure.
 */
import { z } from "zod";

export const AiAnalysisOutputSchema = z.object({
  assessment: z.string().min(1).max(500),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string().max(1000),
  additionalInsights: z.array(z.string().max(300)).max(5),
  recommendations: z.array(z.string().max(300)).max(5),
});

/**
 * Parse and validate raw AI JSON output.
 * Returns the validated result or null if invalid.
 */
export function validateAiOutput(raw: unknown) {
  const result = AiAnalysisOutputSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  return null;
}

/**
 * Build a safe fallback output when AI validation fails.
 */
export function buildFallbackAiOutput(): NonNullable<ReturnType<typeof validateAiOutput>> {
  return {
    assessment: "AI analysis was unavailable. Deterministic analysis results are reliable.",
    confidence: 0,
    reasoning: "AI service returned invalid or empty response.",
    additionalInsights: [],
    recommendations: [],
  };
}
