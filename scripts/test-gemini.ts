/**
 * Integration test for Gemini AI provider.
 * Run with: npx tsx scripts/test-gemini.ts
 */
import { GeminiProvider } from "../services/ai/gemini-provider";
import type { AiScanContext } from "../services/ai/ai-provider";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not set");
  process.exit(1);
}

const provider = new GeminiProvider({
  apiKey,
  model: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  timeoutMs: 10000,
});

const tests: Array<{ name: string; context: AiScanContext }> = [
  {
    name: "A. Benign message",
    context: {
      scanType: "message",
      inputPreview: "Hey Mom, can you pick up milk on your way home?",
      riskScore: 0,
      riskLevel: "minimal",
      category: null,
      summary: "No significant scam indicators were detected.",
      indicators: [],
    },
  },
  {
    name: "B. Obvious phishing",
    context: {
      scanType: "message",
      inputPreview: "Your PayPal account has been limited. Click here: http://paypa1-verify.com to confirm.",
      riskScore: 85,
      riskLevel: "critical",
      category: "phishing",
      summary: "This message contains strong indicators of a phishing attempt.",
      indicators: [
        { severity: "critical", category: "credential_theft", title: "Credential request", description: "Requests account verification via suspicious link", evidence: "Found: PayPa1-verify.com" },
        { severity: "high", category: "urgency", title: "Account threat", description: "Threatens account suspension", evidence: "Found: account has been limited" },
        { severity: "high", category: "phishing", title: "Phishing link language", description: "Encourages clicking a link to verify", evidence: "Found: Click here to confirm" },
      ],
    },
  },
  {
    name: "C. Suspicious URL",
    context: {
      scanType: "url",
      inputPreview: "http://secure-bank-login.verify-update.tk/portal",
      riskScore: 72,
      riskLevel: "high",
      category: "phishing",
      summary: "This website shows multiple indicators commonly associated with phishing.",
      indicators: [
        { severity: "high", category: "domain", title: "Suspicious top-level domain", description: ".tk TLD commonly used in phishing", evidence: "Domain uses .tk TLD" },
        { severity: "high", category: "domain", title: "Potential brand impersonation", description: "Domain appears to impersonate a bank", evidence: "Domain matches lookalike pattern" },
        { severity: "medium", category: "content", title: "Suspicious keyword in URL", description: "URL contains 'verify' keyword", evidence: null },
      ],
    },
  },
  {
    name: "D. Malformed/ambiguous input",
    context: {
      scanType: "message",
      inputPreview: "hello world",
      riskScore: 5,
      riskLevel: "minimal",
      category: null,
      summary: "No significant scam indicators were detected.",
      indicators: [],
    },
  },
];

async function runTest(test: (typeof tests)[0]) {
  console.log(`\n─── ${test.name} ───`);
  console.log(`Input: ${test.context.inputPreview}`);
  console.log(`Deterministic score: ${test.context.riskScore} (${test.context.riskLevel})`);

  const result = await provider.analyze(test.context);

  console.log(`Status: ${result.status}`);
  if (result.status === "error") {
    console.log(`Error: ${result.error}`);
  } else {
    console.log(`Assessment: ${result.assessment}`);
    console.log(`Confidence: ${result.confidence}%`);
    if (result.reasoning) console.log(`Reasoning: ${result.reasoning}`);
    if (result.additionalInsights.length) {
      console.log(`Insights:`, result.additionalInsights);
    }
    if (result.recommendations.length) {
      console.log(`Recommendations:`, result.recommendations);
    }
  }
}

async function main() {
  const key = apiKey!;
  console.log(`Gemini Provider Test — model: ${provider["model"]}`);
  console.log(`API key present: ${!!key}`);
  console.log(`API key length: ${key.length}`);
  console.log("Testing masked key:", key.slice(0, 8) + "..." + key.slice(-4));

  for (const test of tests) {
    await runTest(test);
  }

  console.log("\n✅ All tests completed");
}

main().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
