/**
 * Diagnostic script: shows exactly what patterns match for each test case.
 * Run with: npx tsx scripts/diagnose-scanners.ts
 */

import { analyzeUrl } from "../services/scanner/url-scanner";
import { analyzeMessage } from "../services/scanner/message-scanner";
import { analyzeJob } from "../services/scanner/job-scanner";
import { urlCases, messageCases, jobCases } from "./evaluate-dataset";

async function diagUrl() {
  console.log("\n=== URL SCANNER DIAGNOSTIC ===\n");
  for (const tc of urlCases) {
    const r = await analyzeUrl(tc.input);
    console.log(`[${tc.id}] score=${r.riskScore} level=${r.riskLevel} label=${tc.expectedLabel}`);
    console.log(`  Input: ${tc.input}`);
    console.log(`  Indicators (${r.indicators.length}):`);
    for (const ind of r.indicators) {
      console.log(`    [${ind.severity}] ${ind.title}: ${ind.description}`);
    }
    console.log(`  Expected range: [${tc.expectedScoreRange.min}, ${tc.expectedScoreRange.max}]`);
    const inRange = r.riskScore >= tc.expectedScoreRange.min && r.riskScore <= tc.expectedScoreRange.max;
    console.log(`  In range: ${inRange ? "✅" : "❌"}`);
    console.log();
  }
}

async function diagMessage() {
  console.log("\n=== MESSAGE SCANNER DIAGNOSTIC ===\n");
  for (const tc of messageCases) {
    const r = await analyzeMessage(tc.input);
    console.log(`[${tc.id}] score=${r.riskScore} level=${r.riskLevel} label=${tc.expectedLabel}`);
    console.log(`  Input: ${tc.input.slice(0, 120)}...`);
    console.log(`  Indicators (${r.indicators.length}):`);
    for (const ind of r.indicators) {
      console.log(`    [${ind.severity}] ${ind.title} (${ind.category}): ${ind.evidence || ind.description}`);
    }
    console.log(`  Expected range: [${tc.expectedScoreRange.min}, ${tc.expectedScoreRange.max}]`);
    const inRange = r.riskScore >= tc.expectedScoreRange.min && r.riskScore <= tc.expectedScoreRange.max;
    console.log(`  In range: ${inRange ? "✅" : "❌"}`);
    console.log();
  }
}

async function diagJob() {
  console.log("\n=== JOB SCANNER DIAGNOSTIC ===\n");
  for (const tc of jobCases) {
    const r = await analyzeJob(tc.input);
    console.log(`[${tc.id}] score=${r.riskScore} level=${r.riskLevel} label=${tc.expectedLabel}`);
    console.log(`  Input: ${tc.input.slice(0, 120)}...`);
    console.log(`  Indicators (${r.indicators.length}):`);
    for (const ind of r.indicators) {
      console.log(`    [${ind.severity}] ${ind.title} (${ind.category}): ${ind.evidence || ind.description}`);
    }
    console.log(`  Expected range: [${tc.expectedScoreRange.min}, ${tc.expectedScoreRange.max}]`);
    const inRange = r.riskScore >= tc.expectedScoreRange.min && r.riskScore <= tc.expectedScoreRange.max;
    console.log(`  In range: ${inRange ? "✅" : "❌"}`);
    console.log();
  }
}

async function main() {
  await diagUrl();
  await diagMessage();
  await diagJob();
}

main().catch(console.error);
