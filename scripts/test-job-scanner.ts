/**
 * Unit tests for the Job Scam Scanner.
 * Run with: npx tsx scripts/test-job-scanner.ts
 */
import { analyzeJob } from "../services/scanner/job-scanner";
import type { ScanResult } from "../types/scan";

// ─── Helpers ─────────────────────────────────────────────────────

let assertionFailures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    assertionFailures++;
    return;
  }
  console.log(`  ✅ PASS: ${message}`);
}

// ─── Test Cases ──────────────────────────────────────────────────

const tests: Array<{ name: string; input: string; checks: (result: ScanResult) => void }> = [
  {
    name: "Advance-fee job scam (fake check)",
    input: `We are hiring for a Remote Data Entry position. You will receive a $2,000 check to purchase equipment.
Please send $50 processing fee via Venmo to claim your starter kit. Work from home, flexible hours.
Contact recruiter@quickjobs.xyz immediately. Send your SSN and bank details for direct deposit setup.`,
    checks: (r) => {
      assert(r.riskScore >= 40, `Risk score should be elevated (got ${r.riskScore})`);
      assert(r.riskLevel !== "minimal" && r.riskLevel !== "low", `Risk level should not be minimal/low (got ${r.riskLevel})`);
      assert(r.indicators.length > 0, "Should detect at least one indicator");
      assert(Array.isArray(r.jobAnalysis?.redFlags) && r.jobAnalysis!.redFlags!.length > 0, "Should flag red flags");
      assert(r.jobAnalysis?.companyName === null, "Company name should not be extracted from scam text");
      assert(r.category !== null, "Should determine a category");
    },
  },
  {
    name: "Legitimate job posting",
    input: `Software Engineer - Full Time
TechCorp Inc. is hiring a Senior Software Engineer based in San Francisco, CA.
Requirements: 5+ years experience with React and Node.js.
Salary: $120,000 - $160,000 per year.
Apply at https://techcorp.com/careers`,
    checks: (r) => {
      assert(r.riskScore <= 30, `Risk score should be low for legit job (got ${r.riskScore})`);
      assert(r.riskLevel === "low" || r.riskLevel === "minimal", `Risk level should be low/minimal (got ${r.riskLevel})`);
      assert(r.jobAnalysis?.companyName !== null, "Should extract company name");
      assert(r.jobAnalysis?.jobTitle !== null, "Should extract job title");
      assert(r.jobAnalysis?.salaryRange !== null, "Should extract salary range");
      assert(r.jobAnalysis?.remoteStatus === null || r.jobAnalysis?.remoteStatus === "onsite", "Should detect onsite/remote status");
    },
  },
  {
    name: "Task scam (like-and-subscribe)",
    input: `Earn $500/day working from home! No experience needed.
Just like and subscribe to YouTube videos. All you need is your phone.
Sign up today at bit.ly/earn-fast-money. Send $25 activation fee to start earning.
Limited spots available - apply now before it's too late! Contact: +1 (555) 123-4567`,
    checks: (r) => {
      assert(r.riskScore >= 15, `Risk score should be elevated for task scam (got ${r.riskScore})`);
      assert(r.indicators.some((i) => i.category === "task_scam" || i.category === "unrealistic_claims"),
        "Should detect task scam or unrealistic claims indicators");
      assert(Array.isArray(r.jobAnalysis?.redFlags) && r.jobAnalysis!.redFlags!.length > 0, "Should flag red flags for task scam");
    },
  },
  {
    name: "Impersonation scam (Amazon recruiter)",
    input: `Hello, I'm Sarah Johnson from Amazon HR. We reviewed your profile and would like to offer you
a Work From Home Data Entry position paying $45/hour. No experience required.
To secure this position, please send $200 for background check processing via Gift Cards.
Reply with your full name, address, and date of birth. This offer expires in 24 hours.
Contact: hiring-amazon@tempmail.org`,
    checks: (r) => {
      assert(r.riskScore >= 10, `Risk score should be elevated for impersonation (got ${r.riskScore})`);
      assert(r.indicators.length > 0,
        "Should detect impersonation indicators");
      assert(r.jobAnalysis?.recruiterName !== null, "Should extract recruiter name");
      assert(Array.isArray(r.jobAnalysis?.redFlags) && r.jobAnalysis!.redFlags!.length > 0, "Should flag impersonation red flags");
    },
  },
  {
    name: "Credential theft (fake job portal)",
    input: `Apply now for exciting career opportunities at top companies!
Create your free profile at http://secure-job-portal.net/login to access exclusive listings.
We need your full Social Security Number, bank account details, and government ID
to verify your identity and set up direct deposit. Your information is 100% secure.`,
    checks: (r) => {
      assert(r.riskScore >= 40, `Risk score should be high for credential theft (got ${r.riskScore})`);
      assert(Array.isArray(r.jobAnalysis?.extractedUrls) && r.jobAnalysis!.extractedUrls!.length > 0, "Should extract suspicious URLs");
      assert(Array.isArray(r.jobAnalysis?.redFlags) && r.jobAnalysis!.redFlags!.length > 0, "Should flag credential theft red flags");
    },
  },
  {
    name: "Reshipping scam",
    input: `Hiring Warehouse Associates - Ship Products From Home!
Make $30/hour packaging and shipping items. All materials provided.
Must have your own address for shipping. We will send you packages to repackage
and forward to different addresses. Background check fee: $75 payable by Money Order.
Contact: jobs@freeshipnow.com`,
    checks: (r) => {
      assert(r.riskScore >= 15, `Risk score should be elevated for reshipping scam (got ${r.riskScore})`);
      assert(r.indicators.some((i) => i.category === "reshipping_scam" || i.category === "task_scam"),
        "Should detect reshipping scam pattern");
    },
  },
  {
    name: "Empty input",
    input: "",
    checks: (r) => {
      assert(r.riskScore === 0, `Risk score should be 0 for empty input (got ${r.riskScore})`);
      assert(r.riskLevel === "minimal", `Risk level should be minimal for empty input (got ${r.riskLevel})`);
    },
  },
  {
    name: "Pressure and urgency patterns",
    input: `URGENT HIRING!!! You've been selected for a $85/hour position!!!
Act NOW before we fill the remaining 2 spots!!! Send $150 application fee
via cryptocurrency immediately or lose this opportunity forever!!!
No other qualifications needed - just send payment to confirm your spot!`,
    checks: (r) => {
      assert(r.riskScore >= 45, `Risk score should be elevated for urgency patterns (got ${r.riskScore})`);
      assert(r.indicators.some((i) => i.category === "urgency"), "Should detect urgency patterns");
    },
  },
  {
    name: "Salary extraction",
    input: `Marketing Manager - Google LLC
We are seeking an experienced Marketing Manager for our Mountain View office.
Compensation: $95,000 - $130,000 per year plus benefits.
This is a full-time onsite position. Apply through our official careers page.`,
    checks: (r) => {
      assert(r.jobAnalysis?.salaryRange !== null, "Should extract salary range");
      assert(r.jobAnalysis?.companyName !== null, "Should extract company name");
      assert(r.jobAnalysis?.remoteStatus === "onsite" || r.jobAnalysis?.remoteStatus === null, "Should detect onsite/null status");
      assert(r.jobAnalysis?.employmentType === "full-time", "Should detect full-time employment");
    },
  },
  {
    name: "URL extraction and analysis",
    input: `Join our team at FastCash Inc! Apply at http://paypa1-careers.com or
visit https://secure-login-verify.net/form. Contact us at apply@fastcash.biz
or call (555) 987-6543. Salary: $5,000 per week, remote work. Send $100
registration fee to secure your spot.`,
    checks: (r) => {
      assert(Array.isArray(r.jobAnalysis?.extractedUrls) && r.jobAnalysis!.extractedUrls!.length >= 2, "Should extract at least 2 URLs");
      assert(Array.isArray(r.jobAnalysis?.extractedEmails) && r.jobAnalysis!.extractedEmails!.length > 0, "Should extract email addresses");
      assert(Array.isArray(r.jobAnalysis?.extractedEmails) && r.jobAnalysis!.extractedEmails!.length > 0, "Should extract email addresses");
      assert(r.riskScore >= 50, "Should have elevated score due to suspicious URLs and advance fee");
    },
  },
];

// ─── Runner ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function runAll(): Promise<void> {
  console.log("=".repeat(60));
  console.log("Job Scam Scanner — Test Suite");
  console.log("=".repeat(60));

  for (const tc of tests) {
    process.stdout.write(`\n▶ ${tc.name}...\n`);
    try {
      const result = await analyzeJob(tc.input);
      const prevFailures = assertionFailures;
      try {
        tc.checks(result);
      } catch (e) {
        console.error(`  ❌ Assertion error: ${e instanceof Error ? e.message : String(e)}`);
      }
      const testPassed = assertionFailures === prevFailures;
      if (testPassed) {
        console.log(`  ✅ PASSED (score: ${result.riskScore}, level: ${result.riskLevel}, indicators: ${result.indicators.length})`);
        passed++;
      } else {
        console.log(`  ❌ FAILED (score: ${result.riskScore}, level: ${result.riskLevel}, indicators: ${result.indicators.length})`);
        failed++;
      }
    } catch (e) {
      console.error(`  ❌ ERROR: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  if (assertionFailures > 0) {
    console.log(`  (${assertionFailures} individual assertion(s) also failed)`);
  }
  console.log("=".repeat(60));

  if (failed > 0 || assertionFailures > 0) {
    process.exit(1);
  }
}

runAll().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
