/**
 * Evaluation thresholds — single source of truth for Phase 8+ benchmarking.
 *
 * These thresholds define what the evaluation considers "suspicious" for each
 * scan type. They are intentionally type-specific because:
 *   - URLs/Jobs: few but high-impact signals; ≥40 is meaningfully suspicious
 *   - Messages: accumulate many small signals; ≥60 required for high-confidence flag
 *
 * These thresholds are INDEPENDENT from production risk levels
 * (MINIMAL/LOW/MODERATE/HIGH/CRITICAL). Production uses ≥40 for "moderate"
 * and ≥60 for "high" uniformly, but the evaluation applies type-specific
 * thresholds to account for signal distribution differences.
 */

export const EVALUATION_THRESHOLDS = {
  /** Score ≥ this → classified as "scam" in the evaluation */
  suspicious: {
    url: 40,
    message: 45,
    job: 35,
  },
  /** Score ≤ this → classified as "legitimate" in the evaluation */
  legitimate: {
    url: 25,
    message: 40,
    job: 25,
  },
} as const;

/**
 * Predict classification label for a given scan type and score.
 * Returns "borderline" when the score falls between the two thresholds.
 */
export function predictLabel(
  type: "url" | "message" | "job",
  score: number
): "scam" | "legitimate" | "borderline" {
  const sus = EVALUATION_THRESHOLDS.suspicious[type];
  const leg = EVALUATION_THRESHOLDS.legitimate[type];
  if (score >= sus) return "scam";
  if (score <= leg) return "legitimate";
  return "borderline";
}

/**
 * Whether a score falls within the expected range for a case.
 */
export function scoreWithinRange(
  actual: number,
  expected: { min: number; max: number }
): boolean {
  return actual >= expected.min && actual <= expected.max;
}

/**
 * Human-readable label for display.
 */
export function getPredictedLabel(
  type: "url" | "message" | "job",
  score: number
): string {
  return predictLabel(type, score);
}

/**
 * Print threshold configuration (for debugging / documentation).
 */
export function printThresholds(): void {
  console.log("Evaluation Thresholds:");
  for (const type of ["url" as const, "message" as const, "job" as const]) {
    console.log(
      `  ${type}: suspicious ≥${EVALUATION_THRESHOLDS.suspicious[type]}, legitimate ≤${EVALUATION_THRESHOLDS.legitimate[type]}`
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  printThresholds();
}
