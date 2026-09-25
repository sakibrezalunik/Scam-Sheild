/**
 * Evaluation runner for ScamShield Phase 8.1.
 *
 * Dual-pass evaluation per case:
 *   1. Classification pass — type-specific thresholds determine scam/legitimate/borderline
 *   2. Calibration pass — score must fall within the expected range
 *
 * Runs every test case through the REAL production scanners and computes:
 *   - Classification metrics: confusion matrix, accuracy, precision, recall, FPR
 *   - Calibration metrics: score-range pass/fail rate
 *   - Per-category breakdown (with "insufficient sample" flag for N<3)
 *   - Adversarial case results (if any)
 *   - Score distribution stats
 *
 * Thresholds are INDEPENDENT from production risk levels.
 * Production uses ≥40 for "moderate" and ≥60 for "high" uniformly.
 * Evaluation uses type-specific thresholds to account for signal distribution differences:
 *   - URL/Job: few high-impact signals; ≥40 is meaningfully suspicious
 *   - Message: many small signals accumulate; ≥60 required for high-confidence flag
 *
 * Run with: npx tsx scripts/run-evaluation.ts
 */

import { analyzeUrl } from "../services/scanner/url-scanner";
import { analyzeMessage } from "../services/scanner/message-scanner";
import { analyzeJob } from "../services/scanner/job-scanner";
import type { ScanResult } from "../types/scan";
import {
  getAllCases,
  getCasesByType,
  type EvalCase,
} from "./evaluate-dataset";

// ─── Threshold Configuration ─────────────────────────────────────────────────

/**
 * Evaluation thresholds — source of truth for Phase 8+ benchmarking.
 * These are type-specific because URL/Job signals are fewer but higher-impact,
 * while Message signals accumulate many small contributions.
 */
const EVAL_THRESHOLDS = {
  suspicious: { url: 40, message: 45, job: 35 },
  legitimate: { url: 25, message: 40, job: 25 },
} as const;

function classify(
  type: "url" | "message" | "job",
  score: number
): "scam" | "legitimate" | "borderline" {
  if (score >= EVAL_THRESHOLDS.suspicious[type]) return "scam";
  if (score <= EVAL_THRESHOLDS.legitimate[type]) return "legitimate";
  return "borderline";
}

function inRange(actual: number, expected: { min: number; max: number }): boolean {
  return actual >= expected.min && actual <= expected.max;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CaseResult {
  testCase: EvalCase;
  result: ScanResult;
  /** Type-specific classification (scam/legitimate/borderline) */
  predictedLabel: "scam" | "legitimate" | "borderline";
  /** Whether classification matches expected (true for borderline regardless of pred) */
  classificationPass: boolean;
  /** Whether score falls within expected range */
  calibrationPass: boolean;
  scoreDelta: number; // distance from midpoint of expected range
  diagnostic: string[];
}

interface TypeMetrics {
  type: "url" | "message" | "job";
  cases: EvalCase[];
  results: CaseResult[];
  matrix: { tp: number; tn: number; fp: number; fn: number };
  borderlineCount: number;
  /** Accuracy = (TP + TN) / (TP + TN + FP + FN), excluding borderline from denominator */
  classificationAccuracy: number;
  /** Same but including borderline as "correct" (for reporting) */
  inclusiveAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  avgScore: number;
  scoreStdDev: number;
  /** Fraction of cases where score fell within expected range */
  calibrationPassRate: number;
}

interface CategoryMetrics {
  category: string;
  total: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  borderline: number;
  precision: number;
  recall: number;
  f1: number;
  fpr: number;
  /** True if sample size is too small for reliable metrics */
  insufficientSample: boolean;
}

// ─── Scanner Dispatch ─────────────────────────────────────────────────────────

async function runScan(tc: EvalCase): Promise<ScanResult> {
  switch (tc.type) {
    case "url":
      return analyzeUrl(tc.input);
    case "message":
      return analyzeMessage(tc.input);
    case "job":
      return analyzeJob(tc.input);
  }
}

// ─── Per-Type Evaluation ──────────────────────────────────────────────────────

async function evaluateType(type: "url" | "message" | "job"): Promise<TypeMetrics> {
  const cases = getCasesByType(type);
  const results: CaseResult[] = [];
  const matrix = { tp: 0, tn: 0, fp: 0, fn: 0 };
  let borderlineCount = 0;

  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${type.toUpperCase()} SCANNER — ${cases.length} test cases`);
  console.log("=".repeat(70));
  console.log(
    `  Thresholds: suspicious ≥${EVAL_THRESHOLDS.suspicious[type]}, legitimate ≤${EVAL_THRESHOLDS.legitimate[type]}`
  );

  for (const tc of cases) {
    process.stdout.write(`  ▶ ${tc.id} ... `);

    let result: ScanResult;
    try {
      result = await runScan(tc);
    } catch (e) {
      console.error(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    const predictedLabel = classify(type, result.riskScore);
    const expectedLabel = tc.expectedLabel;

    // Classification pass
    let classificationPass = false;
    if (expectedLabel === predictedLabel) {
      classificationPass = true;
    } else if (expectedLabel === "borderline") {
      // Borderline expected cases are always "pass" for classification
      // (they're indeterminate by definition)
      classificationPass = true;
    }

    // Tally confusion matrix (only for non-borderline expected cases)
    if (expectedLabel !== "borderline") {
      if (expectedLabel === "scam" && predictedLabel === "scam") matrix.tp++;
      else if (expectedLabel === "legitimate" && predictedLabel === "legitimate") matrix.tn++;
      else if (expectedLabel === "scam" && predictedLabel === "legitimate") matrix.fn++;
      else if (expectedLabel === "legitimate" && predictedLabel === "scam") matrix.fp++;
    } else {
      borderlineCount++;
    }

    // Calibration pass: score within expected range?
    const calibrationPass = inRange(result.riskScore, tc.expectedScoreRange);
    const mid = (tc.expectedScoreRange.min + tc.expectedScoreRange.max) / 2;
    const scoreDelta = Math.abs(result.riskScore - mid);

    // Diagnostic checks
    const diagnostic: string[] = [];
    if (!calibrationPass) {
      diagnostic.push(
        `Score ${result.riskScore} outside expected range [${tc.expectedScoreRange.min}, ${tc.expectedScoreRange.max}]`
      );
    }
    if (!classificationPass) {
      diagnostic.push(
        `Predicted "${predictedLabel}" but expected "${expectedLabel}"`
      );
    }

    // Indicator-presence checks (spot-checks specific expectations)
    const note = tc.note.toLowerCase();
    if (note.includes("typosquat") || note.includes("misspell")) {
      const hasLookalike = result.indicators.some(
        (i) => i.title.toLowerCase().includes("lookalike") || i.title.toLowerCase().includes("impersonation")
      );
      if (!hasLookalike) diagnostic.push("Expected lookalike/impersonation indicator but none found");
    }
    if (note.includes("advance fee") || note.includes("processing fee") || note.includes("registration fee")) {
      const hasFee = result.indicators.some(
        (i) => i.title.toLowerCase().includes("fee") || i.title.toLowerCase().includes("payment")
      );
      if (!hasFee) diagnostic.push("Expected fee-related indicator but none found");
    }
    if (note.includes("credential") || note.includes("ssn") || note.includes("bank account")) {
      const hasCred = result.indicators.some(
        (i) => i.title.toLowerCase().includes("credential") || i.title.toLowerCase().includes("ssn") || i.title.toLowerCase().includes("sensitive")
      );
      if (!hasCred) diagnostic.push("Expected credential-theft indicator but none found");
    }
    if (note.includes("reshipping")) {
      const hasReship = result.indicators.some((i) => i.category === "reshipping_scam");
      if (!hasReship) diagnostic.push("Expected reshipping indicator but none found");
    }
    if (note.includes("task scam")) {
      const hasTask = result.indicators.some((i) => i.category === "task_scam");
      if (!hasTask) diagnostic.push("Expected task scam indicator but none found");
    }

    // Status: ✅ both pass | ⚠️ one pass | ❌ both fail
    const status = classificationPass && calibrationPass ? "✅" : classificationPass || calibrationPass ? "⚠️" : "❌";
    console.log(
      `${status} score=${result.riskScore} level=${result.riskLevel} pred="${predictedLabel}" cal=${calibrationPass ? "✅" : "❌"}`
    );
    for (const d of diagnostic) {
      console.log(`     ⚡ ${d}`);
    }

    results.push({ testCase: tc, result, predictedLabel, classificationPass, calibrationPass, scoreDelta, diagnostic });
  }

  // Aggregate metrics (excluding borderline from confusion matrix)
  const decisiveCases = cases.filter((c) => c.expectedLabel !== "borderline");
  const decisiveTotal = decisiveCases.length;
  const accuracy = decisiveTotal > 0 ? (matrix.tp + matrix.tn) / decisiveTotal : 0;
  const inclusiveAccuracy = cases.length > 0 ? (matrix.tp + matrix.tn + borderlineCount) / cases.length : 0;
  const precision = (matrix.tp + matrix.fp) > 0 ? matrix.tp / (matrix.tp + matrix.fp) : 0;
  const recall = (matrix.tp + matrix.fn) > 0 ? matrix.tp / (matrix.tp + matrix.fn) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const fpr = (matrix.tn + matrix.fp) > 0 ? matrix.fp / (matrix.tn + matrix.fp) : 0;
  const fnr = (matrix.tp + matrix.fn) > 0 ? matrix.fn / (matrix.tp + matrix.fn) : 0;

  const scores = results.map((r) => r.result.riskScore);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const scoreStdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length);

  const calibrationPasses = results.filter((r) => r.calibrationPass).length;
  const calibrationPassRate = results.length > 0 ? calibrationPasses / results.length : 0;

  return {
    type,
    cases,
    results,
    matrix,
    borderlineCount,
    classificationAccuracy: accuracy,
    inclusiveAccuracy,
    precision,
    recall,
    f1,
    falsePositiveRate: fpr,
    falseNegativeRate: fnr,
    avgScore,
    scoreStdDev,
    calibrationPassRate,
  };
}

// ─── Category Breakdown ───────────────────────────────────────────────────────

function computeCategoryBreakdown(allResults: CaseResult[]): CategoryMetrics[] {
  const catMap = new Map<
    string,
    { tp: number; tn: number; fp: number; fn: number; borderline: number; total: number }
  >();

  for (const r of allResults) {
    const cat = r.testCase.category || "uncategorized";
    if (!catMap.has(cat)) {
      catMap.set(cat, { tp: 0, tn: 0, fp: 0, fn: 0, borderline: 0, total: 0 });
    }
    const m = catMap.get(cat)!;
    m.total++;

    if (r.testCase.expectedLabel === "borderline") {
      m.borderline++;
    } else if (r.classificationPass && r.testCase.expectedLabel === "scam" && r.predictedLabel === "scam") {
      m.tp++;
    } else if (r.classificationPass && r.testCase.expectedLabel === "legitimate" && r.predictedLabel === "legitimate") {
      m.tn++;
    } else if (r.testCase.expectedLabel === "scam" && r.predictedLabel === "legitimate") {
      m.fn++;
    } else if (r.testCase.expectedLabel === "legitimate" && r.predictedLabel === "scam") {
      m.fp++;
    }
  }

  return Array.from(catMap.entries())
    .map(([category, m]) => {
      const decisive = m.tp + m.tn + m.fp + m.fn;
      const precision = (m.tp + m.fp) > 0 ? m.tp / (m.tp + m.fp) : 0;
      const recall = (m.tp + m.fn) > 0 ? m.tp / (m.tp + m.fn) : 0;
      const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      const fpr = (m.tn + m.fp) > 0 ? m.fp / (m.tn + m.fp) : 0;
      return {
        category,
        ...m,
        precision,
        recall,
        f1,
        fpr,
        insufficientSample: decisive < 3,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ─── Score Distribution Stats ─────────────────────────────────────────────────

function scoreDistributionStats(results: CaseResult[]): {
  legitScores: number[];
  scamScores: number[];
  borderlineScores: number[];
} {
  const legitScores = results
    .filter((r) => r.testCase.expectedLabel === "legitimate")
    .map((r) => r.result.riskScore);
  const scamScores = results
    .filter((r) => r.testCase.expectedLabel === "scam")
    .map((r) => r.result.riskScore);
  const borderlineScores = results
    .filter((r) => r.testCase.expectedLabel === "borderline")
    .map((r) => r.result.riskScore);

  return { legitScores, scamScores, borderlineScores };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Adversarial Case Detection ───────────────────────────────────────────────

function identifyAdversarial(results: CaseResult[]): CaseResult[] {
  return results.filter((r) => {
    const meta = (r.testCase as EvalCase & { adversarial?: boolean }).adversarial;
    return meta === true;
  });
}

// ─── Improvement Recommendations ──────────────────────────────────────────────

function generateRecommendations(
  urlM: TypeMetrics,
  msgM: TypeMetrics,
  jobM: TypeMetrics,
  categories: CategoryMetrics[]
): string[] {
  const recs: string[] = [];

  for (const [label, m] of [["URL", urlM], ["Message", msgM], ["Job", jobM]] as const) {
    if (m.falsePositiveRate > 0.1) {
      recs.push(
        `[${label}] FPR is ${(m.falsePositiveRate * 100).toFixed(1)}% — consider relaxing thresholds or adding negative overrides.`
      );
    }
    if (m.falseNegativeRate > 0.1) {
      recs.push(
        `[${label}] FNR is ${(m.falseNegativeRate * 100).toFixed(1)}% — consider adding new detection patterns.`
      );
    }
    if (m.calibrationPassRate < 0.8) {
      recs.push(
        `[${label}] Calibration pass rate is ${(m.calibrationPassRate * 100).toFixed(1)}% — expected score ranges may need adjustment or scanner scoring needs tuning.`
      );
    }
  }

  // Category-specific issues (only where sample is sufficient)
  for (const cat of categories) {
    if (cat.insufficientSample) continue;
    if (cat.recall < 0.7 && cat.total >= 3) {
      recs.push(`[${cat.category}] Recall is ${(cat.recall * 100).toFixed(0)}% (N=${cat.total}) — add or strengthen patterns.`);
    }
    if (cat.fpr > 0.3 && cat.total >= 3) {
      recs.push(`[${cat.category}] FPR is ${(cat.fpr * 100).toFixed(0)}% (N=${cat.total}) — review for over-triggering.`);
    }
  }

  // Specific pattern-level observations
  const all = [...urlM.results, ...msgM.results, ...jobM.results];
  const fps = all.filter((r) => r.testCase.expectedLabel === "legitimate" && r.predictedLabel === "scam");
  if (fps.some((r) => r.testCase.id.includes("url-007"))) {
    recs.push(
      "URL scanner: 'login' in path triggers on legitimate sites (netflix.com/login). Require additional signals before scoring 'login' as risk."
    );
  }
  if (fps.some((r) => r.testCase.category === "remote_legit")) {
    recs.push(
      "Job scanner: Legitimate remote postings with 'work from home' may over-trigger. Add positive signals for formal interview descriptions and salary ranges."
    );
  }

  if (recs.length === 0) {
    recs.push("No critical improvements needed. All scanners performing within acceptable bounds.");
  }

  return recs;
}

// ─── Main Runner ──────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║       ScamShield — Phase 8.1 Evaluation Framework (Corrected)   ║");
  console.log("║           Dual-Pass: Classification + Calibration               ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(
    `\n  Thresholds: URL suspicious ≥40, legitimate ≤25`
  );
  console.log(
    `            Message suspicious ≥45, legitimate ≤40`
  );
  console.log(
    `            Job suspicious ≥35, legitimate ≤25`
  );
  console.log(
    `  Borderline cases excluded from confusion matrix, counted separately.`
  );

  const allCases = getAllCases();
  console.log(`\n  Total cases: ${allCases.length}`);
  console.log(`    URL:    ${getCasesByType("url").length}`);
  console.log(`    Message: ${getCasesByType("message").length}`);
  console.log(`    Job:    ${getCasesByType("job").length}`);
  console.log(`\n  Note: AI analysis runs fire-and-forget and does NOT affect scores.\n`);

  const [urlM, msgM, jobM] = await Promise.all([
    evaluateType("url"),
    evaluateType("message"),
    evaluateType("job"),
  ]);

  const allResults = [...urlM.results, ...msgM.results, ...jobM.results];
  const categories = computeCategoryBreakdown(allResults);
  const recommendations = generateRecommendations(urlM, msgM, jobM, categories);
  const { legitScores, scamScores, borderlineScores } = scoreDistributionStats(allResults);
  const adversarial = identifyAdversarial(allResults);

  // ── Overall Metrics ──────────────────────────────────────────────────────
  const overallTP = urlM.matrix.tp + msgM.matrix.tp + jobM.matrix.tp;
  const overallTN = urlM.matrix.tn + msgM.matrix.tn + jobM.matrix.tn;
  const overallFP = urlM.matrix.fp + msgM.matrix.fp + jobM.matrix.fp;
  const overallFN = urlM.matrix.fn + msgM.matrix.fn + jobM.matrix.fn;
  const overallBorderline = urlM.borderlineCount + msgM.borderlineCount + jobM.borderlineCount;
  const decisiveTotal = allCases.length - overallBorderline;

  const overallAccuracy = decisiveTotal > 0 ? (overallTP + overallTN) / decisiveTotal : 0;
  const overallPrecision = (overallTP + overallFP) > 0 ? overallTP / (overallTP + overallFP) : 0;
  const overallRecall = (overallTP + overallFN) > 0 ? overallTP / (overallTP + overallFN) : 0;
  const overallF1 = (overallPrecision + overallRecall) > 0 ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall) : 0;
  const overallFPR = (overallTN + overallFP) > 0 ? overallFP / (overallTN + overallFP) : 0;

  // ── Summary Report ───────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  OVERALL PERFORMANCE SUMMARY");
  console.log("═".repeat(70));
  console.log(`  Total cases:         ${allCases.length}`);
  console.log(`  Decisive cases:      ${decisiveTotal}  (excludes ${overallBorderline} borderline)`);
  console.log(`  True  Positives:     ${overallTP}`);
  console.log(`  True  Negatives:     ${overallTN}`);
  console.log(`  False Positives:     ${overallFP}  (FPR: ${(overallFPR * 100).toFixed(1)}%)`);
  console.log(`  False Negatives:     ${overallFN}  (FNR: ${((overallFN / (overallTP + overallFN)) * 100).toFixed(1)}%)`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Classification Acc:  ${(overallAccuracy * 100).toFixed(1)}%`);
  console.log(`  Precision:           ${(overallPrecision * 100).toFixed(1)}%`);
  console.log(`  Recall:              ${(overallRecall * 100).toFixed(1)}%`);
  console.log(`  F1 Score:            ${(overallF1 * 100).toFixed(1)}%`);
  console.log(`  False-Pos Rate:      ${(overallFPR * 100).toFixed(1)}%`);

  // Overall calibration
  const totalCalPass = allResults.filter((r) => r.calibrationPass).length;
  console.log(`  Calibration Pass:    ${(totalCalPass / allResults.length * 100).toFixed(1)}%  (${totalCalPass}/${allResults.length} cases in expected score range)`);

  // ── Per-Type Breakdown ───────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  PER-TYPE BREAKDOWN");
  console.log("═".repeat(70));
  for (const [label, m] of [["URL", urlM], ["Message", msgM], ["Job", jobM]] as const) {
    console.log(`\n  ${label}:`);
    console.log(`    Cases:             ${m.cases.length}  (${m.matrix.tp} TP, ${m.matrix.tn} TN, ${m.matrix.fp} FP, ${m.matrix.fn} FN, ${m.borderlineCount} borderline)`);
    console.log(`    Classification Acc:${" ".repeat(5)}${(m.classificationAccuracy * 100).toFixed(1)}%`);
    console.log(`    Inclusive Acc:     ${" ".repeat(5)}${(m.inclusiveAccuracy * 100).toFixed(1)}%  (borderline counted as correct)`);
    console.log(`    Precision:         ${" ".repeat(5)}${(m.precision * 100).toFixed(1)}%`);
    console.log(`    Recall:            ${" ".repeat(5)}${(m.recall * 100).toFixed(1)}%`);
    console.log(`    F1:                ${" ".repeat(5)}${(m.f1 * 100).toFixed(1)}%`);
    console.log(`    FPR:               ${" ".repeat(5)}${(m.falsePositiveRate * 100).toFixed(1)}%`);
    console.log(`    Calib. Pass Rate:  ${" ".repeat(3)}${(m.calibrationPassRate * 100).toFixed(1)}%`);
    console.log(`    Avg Score:         ${" ".repeat(4)}${m.avgScore.toFixed(1)} ± ${m.scoreStdDev.toFixed(1)}`);
  }

  // ── Score Distribution ───────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  SCORE DISTRIBUTION");
  console.log("═".repeat(70));
  if (legitScores.length > 0) {
    console.log(`  Legitimate cases:  avg=${(legitScores.reduce((a,b)=>a+b,0)/legitScores.length).toFixed(1)}  median=${median(legitScores).toFixed(1)}  range=[${Math.min(...legitScores)}, ${Math.max(...legitScores)}]  (N=${legitScores.length})`);
  }
  if (scamScores.length > 0) {
    console.log(`  Scam cases:        avg=${(scamScores.reduce((a,b)=>a+b,0)/scamScores.length).toFixed(1)}  median=${median(scamScores).toFixed(1)}  range=[${Math.min(...scamScores)}, ${Math.max(...scamScores)}]  (N=${scamScores.length})`);
  }
  if (borderlineScores.length > 0) {
    console.log(`  Borderline cases:  avg=${(borderlineScores.reduce((a,b)=>a+b,0)/borderlineScores.length).toFixed(1)}  median=${median(borderlineScores).toFixed(1)}  range=[${Math.min(...borderlineScores)}, ${Math.max(...borderlineScores)}]  (N=${borderlineScores.length})`);
  }

  // Gap analysis
  if (legitScores.length > 0 && scamScores.length > 0) {
    const legitMax = Math.max(...legitScores);
    const scamMin = Math.min(...scamScores);
    const gap = scamMin - legitMax;
    console.log(`\n  Separation gap:    ${gap >= 0 ? `${gap.toFixed(1)} points (clean separation)` : `-${Math.abs(gap).toFixed(1)} points (overlap!)`}`);
  }

  // ── Category Breakdown ───────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  CATEGORY BREAKDOWN");
  console.log("═".repeat(70));
  console.log(
    `  ${"Category".padEnd(26)} ${"N".padStart(3)} ${"TP".padStart(3)} ${"TN".padStart(3)} ${"FP".padStart(3)} ${"FN".padStart(3)} ${"BD".padStart(3)} ${"Prec".padStart(6)} ${"Recall".padStart(6)} ${"FPR".padStart(5)}  ${"Note"}`
  );
  console.log(`  ${"-".repeat(80)}`);
  for (const cat of categories) {
    const note = cat.insufficientSample ? "N<3" : "";
    const flag = cat.recall < 0.7 && !cat.insufficientSample ? " ⚠LOW-REC" : cat.fpr > 0.3 && !cat.insufficientSample ? " ⚠HIGH-FPR" : "";
    const precStr = cat.precision > 0 ? `${(cat.precision * 100).toFixed(0)}%` : "—";
    const recStr = cat.recall > 0 ? `${(cat.recall * 100).toFixed(0)}%` : "—";
    const fprStr = cat.fpr > 0 ? `${(cat.fpr * 100).toFixed(0)}%` : "—";
    console.log(
      `  ${cat.category.padEnd(26)} ${String(cat.total).padStart(3)} ${String(cat.tp).padStart(3)} ${String(cat.tn).padStart(3)} ${String(cat.fp).padStart(3)} ${String(cat.fn).padStart(3)} ${String(cat.borderline).padStart(3)} ${precStr.padStart(6)} ${recStr.padStart(6)} ${fprStr.padStart(5)}  ${note}${flag}`
    );
  }

  // ── False Positive Analysis ──────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  FALSE POSITIVE ANALYSIS");
  console.log("═".repeat(70));
  for (const [label, m] of [["URL", urlM], ["Message", msgM], ["Job", jobM]] as const) {
    const fps = m.results.filter((r) => r.testCase.expectedLabel === "legitimate" && r.predictedLabel === "scam");
    if (fps.length === 0) {
      console.log(`\n  ${label}: No false positives ✅`);
      continue;
    }
    console.log(`\n  ${label} — ${fps.length} false positive(s):`);
    for (const c of fps) {
      console.log(`    • ${c.testCase.id}: score=${c.result.riskScore} ("${c.testCase.note}")`);
      console.log(`      Indicators: ${c.result.indicators.map((i) => i.title).join(", ")}`);
    }
  }

  // ── False Negative Analysis ──────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  FALSE NEGATIVE ANALYSIS");
  console.log("═".repeat(70));
  for (const [label, m] of [["URL", urlM], ["Message", msgM], ["Job", jobM]] as const) {
    const fns = m.results.filter((r) => r.testCase.expectedLabel === "scam" && r.predictedLabel === "legitimate");
    if (fns.length === 0) {
      console.log(`\n  ${label}: No false negatives ✅`);
      continue;
    }
    console.log(`\n  ${label} — ${fns.length} false negative(s):`);
    for (const c of fns) {
      console.log(`    • ${c.testCase.id}: score=${c.result.riskScore} ("${c.testCase.note}")`);
      console.log(`      Indicators found: ${c.result.indicators.length > 0 ? c.result.indicators.map((i) => i.title).join(", ") : "(none)"}`);
    }
  }

  // ── Calibration Failures ─────────────────────────────────────────────────
  const calFailures = allResults.filter((r) => !r.calibrationPass);
  if (calFailures.length > 0) {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`  CALIBRATION FAILURES (${calFailures.length} cases outside expected score range)`);
    console.log("═".repeat(70));
    for (const c of calFailures) {
      console.log(
        `  ⚠ ${c.testCase.id}: score=${c.result.riskScore} expected=[${c.testCase.expectedScoreRange.min}, ${c.testCase.expectedScoreRange.max}] ("${c.testCase.note}")`
      );
    }
  }

  // ── Adversarial Cases ────────────────────────────────────────────────────
  if (adversarial.length > 0) {
    console.log(`\n${"═".repeat(70)}`);
    console.log("  ADVERSARIAL CASE RESULTS");
    console.log("═".repeat(70));
    for (const c of adversarial) {
      const status = c.classificationPass && c.calibrationPass ? "✅" : c.classificationPass || c.calibrationPass ? "⚠️" : "❌";
      console.log(
        `  ${status} ${c.testCase.id}: score=${c.result.riskScore} pred="${c.predictedLabel}" class=${c.classificationPass ? "✅" : "❌"} cal=${c.calibrationPass ? "✅" : "❌"} — "${c.testCase.note}"`
      );
    }
  }

  // ── Borderline Cases ─────────────────────────────────────────────────────
  const bdCases = allResults.filter((r) => r.testCase.expectedLabel === "borderline");
  if (bdCases.length > 0) {
    console.log(`\n${"═".repeat(70)}`);
    console.log("  BORDERLINE CASE ANALYSIS");
    console.log("═".repeat(70));
    for (const c of bdCases) {
      const inRange = c.calibrationPass;
      const status = inRange ? "✅" : "⚠️";
      console.log(
        `  ${status} ${c.testCase.id}: score=${c.result.riskScore} level=${c.result.riskLevel} range=[${c.testCase.expectedScoreRange.min}, ${c.testCase.expectedScoreRange.max}] — "${c.testCase.note}"`
      );
    }
  }

  // ── Recommendations ──────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);
  console.log("  EVIDENCE-BASED RECOMMENDATIONS");
  console.log("═".repeat(70));
  for (let i = 0; i < recommendations.length; i++) {
    console.log(`  ${i + 1}. ${recommendations[i]}`);
  }

  // ── Verdict ──────────────────────────────────────────────────────────────
  const passThreshold = 0.70;
  console.log(`\n${"═".repeat(70)}`);
  if (overallAccuracy >= passThreshold) {
    console.log(`  ✅ PASS — Classification accuracy ${(overallAccuracy * 100).toFixed(1)}% meets ${passThreshold * 100}% threshold`);
  } else {
    console.log(`  ⚠️  BELOW THRESHOLD — Classification accuracy ${(overallAccuracy * 100).toFixed(1)}% is below ${passThreshold * 100}% target`);
    const weakCats = categories.filter((c) => c.recall < 0.7 && !c.insufficientSample);
    if (weakCats.length > 0) {
      console.log(`      Focus areas: ${weakCats.map((c) => c.category).join(", ")}`);
    }
  }
  console.log("═".repeat(70));

  // ── Deterministic-scan-only note ─────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log(`  NOTE: All scores are from DETERMINISTIC pattern matching only.`);
  console.log(`  AI analysis runs fire-and-forget and does NOT affect reported scores.`);
  console.log(`─`.repeat(70));
}

main().catch((err) => {
  console.error("Evaluation runner fatal error:", err);
  process.exit(1);
});
