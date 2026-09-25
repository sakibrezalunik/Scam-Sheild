/**
 * Job Scanner — deterministic analysis of job postings/recruiter messages.
 *
 * Architecture:
 *   user input → entity extraction → pattern matching → risk scoring
 *   → structured indicators → Gemini AI context (fire-and-forget)
 *
 * The deterministic result is always authoritative. AI supplements it.
 */
import {
  extractUrlsFromText,
  extractEmailsFromText,
  extractPhonesFromText,
  createInputPreview,
  hashInput,
} from "@/services/security/input-validator";
import { analyzeUrl } from "./url-scanner";
import { getRiskLevel } from "@/services/scoring/risk-engine";
import type { JobAnalysisResult, RiskIndicator, ScanResult, ScanCategory } from "@/types/scan";
import { analyzeWithAi } from "@/services/ai/ai-analyzer";

// ─── Scam Pattern Definitions ──────────────────────────────────

interface JobScamPattern {
  pattern: RegExp;
  score: number;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
}

const JOB_SCAM_PATTERNS: JobScamPattern[] = [
  // A. MONEY / UPFRONT PAYMENT
  {
    pattern: /\b(application\s*fee|registration\s*fee|processing\s*fee|admin\s*fee|activation\s*fee)\b/i,
    score: 15,
    severity: "high",
    category: "advance_fee",
    title: "Upfront fee requested",
    description: "Legitimate employers never charge application or registration fees.",
  },
  {
    pattern: /\b(training\s*fee|certification\s*fee|background\s*check\s*fee|equipment\s*fee)\b/i,
    score: 12,
    severity: "high",
    category: "advance_fee",
    title: "Training/certification fee",
    description: "Being asked to pay for training or certification before starting work is a common job scam.",
  },
  {
    pattern: /\b(deposit|wire\s*payment|western\s*union|money\s*g[gm]gram|gift\s*card|cryptocurrency|bitcoin|usdt|money\s*order)\b/i,
    score: 18,
    severity: "critical",
    category: "advance_fee",
    title: "Suspicious payment method",
    description: "Requests for deposits or payment via gift cards, cryptocurrency, or wire transfer are major red flags.",
  },
  {
    pattern: /\b(pay\s+(you|them|us)|refund|reimburse)\s+(before|prior|first)\b/i,
    score: 14,
    severity: "high",
    category: "advance_fee",
    title: "Payment before employment",
    description: "Being asked to pay money before being employed is not normal for legitimate jobs.",
  },
  {
    pattern: /\b(purchase\s+(equipment|starter\s*kit|software)|pay\s+for\s+your\s+(own\s+)?equipment)\b/i,
    score: 10,
    severity: "medium",
    category: "advance_fee",
    title: "Equipment purchase requirement",
    description: "Being told to purchase your own equipment before starting may indicate a scam.",
  },

  // B. SENSITIVE INFORMATION REQUESTS
  {
    pattern: /\b(sent\s*me?\s+your\s+(ssn|social\s+security|bank\s+(account|number)|credit\s*card|password|pin))\b/i,
    score: 20,
    severity: "critical",
    category: "credential_theft",
    title: "Sensitive information solicited",
    description: "Asking for SSN, bank details, or passwords early in the process is a major warning sign.",
  },
  {
    pattern: /\b(share\s+your\s+(bank\s+account|card\s+number|otp|verification\s+code|password))\b/i,
    score: 18,
    severity: "critical",
    category: "credential_theft",
    title: "Financial credential request",
    description: "Requests for banking credentials or OTP codes at the hiring stage are scams.",
  },
  {
    pattern: /\b(social\s+security\s+number|ssn\b|government\s+id|passport\s+(number|copy))\b/i,
    score: 10,
    severity: "high",
    category: "credential_theft",
    title: "Government ID request",
    description: "Excessive request for government ID or SSN before a formal offer is suspicious.",
  },
  {
    pattern: /\b(ssn|social\s+security\s+number|bank\s+account|credit\s+card|full\s+name|date\s+of\s+birth)\b[\s\S]*\b(verify|confirm|set\s+up|direct\s+deposit|identity)\b/i,
    score: 15,
    severity: "critical",
    category: "credential_theft",
    title: "Credential verification trap",
    description: "Requesting personal details for 'verification' or 'setup' is a credential harvesting tactic.",
  },
  {
    pattern: /\b(send\s+me?\s+your\s+(photo\s+of\s+)?(id|passport|drivers?\s*license))\b/i,
    score: 8,
    severity: "medium",
    category: "credential_theft",
    title: "Identity document request",
    description: "Requesting photos of identity documents before a formal interview process is unusual.",
  },

  // C. UNREALISTIC EMPLOYMENT CLAIMS
  {
    pattern: /\b(guaranteed\s+(job|employment|income|hire)|no\s+(interview|experience|qualifications|degree)(?:\s*required)?)/i,
    score: 16,
    severity: "high",
    category: "unrealistic_claims",
    title: "Guaranteed employment claim",
    description: "Legitimate employers rarely guarantee jobs or income. This is a classic scam tactic.",
  },
  {
    pattern: /\b(earn|make|receive|get)\s+\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(per\s*(week|month|hour|day|app|task)|a\s*(week|month|hour|day|app|task)|\/(?:week|month|hour|day|app|task))/i,
    score: 14,
    severity: "high",
    category: "unrealistic_claims",
    title: "Unrealistic income claim",
    description: "Promises of high income with minimal qualifications are typical of job scams.",
  },
  {
    pattern: /\b(\$?(?:2[5-9]|[3-9]\d|\d{3,})(?:,\d{3})*(?:\.\d{2})?)\s*(per|\/)\s*(hour|hr\.?)(?!\s*(minimum|median|average))/i,
    score: 10,
    severity: "medium",
    category: "unrealistic_claims",
    title: "High hourly rate claim",
    description: "Unusually high hourly pay with little qualification is a common job scam indicator.",
  },
  {
    pattern: /\b(hire\s+(immediately|instantly)|start\s+(today|immediately|tonight))/i,
    score: 10,
    severity: "medium",
    category: "urgency",
    title: "Instant hire promise",
    description: "Offering immediate hiring without any interview process is highly suspicious.",
  },
  {
    pattern: /\b(work\s+from\s+home\s+(only|position|opportunity)|remote\s+(data\s*entry|customer\s*service|translator))/i,
    score: 6,
    severity: "low",
    category: "job_scam",
    title: "Suspicious work-from-home offer",
    description: "Unsolicited work-from-home offers are frequently scams. Verify through official channels.",
  },
  {
    pattern: /\b(no\s+(special\s+)?skills?\s*(required|needed)|no\s+(qualifications|degree|required)|simple\s+(tasks?|work|job)|easy\s+money)/i,
    score: 12,
    severity: "medium",
    category: "unrealistic_claims",
    title: "No skills required claim",
    description: "Jobs requiring no skills but paying well are almost always fraudulent.",
  },
  {
    pattern: /\b(vague\s+job\s+responsibilities|unclear\s+duties|minimal\s+description)/i,
    score: 8,
    severity: "medium",
    category: "unrealistic_claims",
    title: "Vague job description",
    description: "Legitimate job postings describe specific duties and requirements.",
  },

  // D. SUSPICIOUS COMMUNICATION
  {
    pattern: /\b(whatsapp\s*(only|communication|interview|contact|group)|telegram\s*(only|chat|channel)|move\s+(the\s+)?conversation\s+(to|on)\s+(whatsapp|telegram))/i,
    score: 14,
    severity: "high",
    category: "suspicious_communication",
    title: "Messaging app recruitment",
    description: "Legitimate companies do not conduct recruitment exclusively through WhatsApp or Telegram.",
  },
  {
    pattern: /\b(personal\s+email|gmail\.com|yahoo\.com|outlook\.com)\s+(recruiter|hiring|hr)/i,
    score: 10,
    severity: "medium",
    category: "impersonation",
    title: "Personal email impersonation",
    description: "Recruiters using personal email addresses instead of company domains is suspicious.",
  },
  {
    pattern: /\b(move\s+(the\s+)?conversation\s*off\s*(platform|site)|contact\s+me\s+(directly|personally))/i,
    score: 10,
    severity: "medium",
    category: "suspicious_communication",
    title: "Moving communication off-platform",
    description: "Trying to move communication off the official platform avoids oversight and is a red flag.",
  },
  {
    pattern: /\b(do\s*n't\s*(tell|inform|share)\s+(anyone|them|us)|don't\s+tell\s+anyone|do not (tell|inform|share) (anyone|them|us)|keep\s+this\s+(secret|confidential))/i,
    score: 12,
    severity: "high",
    category: "secrecy",
    title: "Secrecy pressure",
    description: "Asking you to keep the job opportunity secret is a classic manipulation tactic.",
  },

  // E. FINANCIAL / TASK SCAMS
  {
    pattern: /\b(money\s+(transfer|conversion|processing|mule)|transfer\s+(funds|money)|forward\s+(payments|packages|checks))/i,
    score: 18,
    severity: "critical",
    category: "task_scam",
    title: "Money transfer scheme",
    description: "Being asked to transfer, forward, or process money is a money mule or task scam.",
  },
  {
    pattern: /\b(deposit\s+(a\s+)?check|receive\s+and\s+send|keep\s+(a\s+)?portion)/i,
    score: 16,
    severity: "high",
    category: "task_scam",
    title: "Check deposit scheme",
    description: "Receiving and forwarding checks or keeping a portion is a check fraud scheme.",
  },
  {
    pattern: /\b(rating\s+(jobs?|items?)|click\s+(tasks?|links?)|optimization\s+tasks?|crypto\s+(tasks?|trading|mining)|like\s+and\s+subscribe)/i,
    score: 14,
    severity: "high",
    category: "task_scam",
    title: "Task-based scam",
    description: "Rating tasks or clicking links for payment is a common online task scam.",
  },
  {
    pattern: /\b(reshipping\s+(packages?|goods?)|receive\s+and\s+reship|package\s+scam|ship\s+products\s+from\s+home|ship\s+items|repurchase.*ship.*(address|to\s+us)|send\s+items\s+to\s+different\s+address)/i,
    score: 16,
    severity: "high",
    category: "reshipping_scam",
    title: "Reshipping scheme",
    description: "Receiving and reshipping packages is a reshipping scam used to move stolen goods.",
  },
  {
    pattern: /\b(account\s+(rental|sharing|lease)|rent\s+your\s+(account|bank|paypal))/i,
    score: 20,
    severity: "critical",
    category: "task_scam",
    title: "Account rental scam",
    description: "Renting out your bank or payment accounts is illegal and a known scam pattern.",
  },

  // MONEY MULE — payment forwarding variant
  {
    pattern: /\b(receive|deposit|process).*(payment|fund|money).*?(forward|send\s+on|route)/i,
    score: 18,
    severity: "critical",
    category: "money_mule",
    title: "Payment forwarding scheme",
    description: "Asking someone to receive payments into their personal account and forward them is a money mule scam.",
  },

  // MLM / pyramid scheme
  {
    pattern: /\b(starter\s+kit|join\s+our.*program|recruit\s+\d+\s+friends|get\s+a\s+free\s+vacation|be\s+your\s+own\s+boss|network\s+marketing)\b/i,
    score: 14,
    severity: "high",
    category: "mlm_scheme",
    title: "MLM/pyramid scheme indicator",
    description: "Programs requiring upfront purchases with recruitment bonuses are often MLM or pyramid schemes.",
  },

  // Illegal activity / drug mule
  {
    pattern: /(?:package[\s\S]*?ship[\s\S]*?(?:supplement|product)|no\s+questions?\s+asked)[\s\S]*?(?:controlled|illegal|substance)/i,
    score: 20,
    severity: "critical",
    category: "illegal_activity",
    title: "Illegal activity recruitment",
    description: "Recruiting people to package and ship controlled substances is illegal activity.",
  },

  // F. IMPERSONATION
  {
    pattern: /\b(representing\s+(a\s+)?(?:well-known|the\s+company)|authorized\s+representative)\b/i,
    score: 6,
    severity: "low",
    category: "impersonation",
    title: "Authority claim",
    description: "Claims of representing a company should be verified independently.",
  },
  {
    pattern: /\b(job\s+(offer|letter)\s+(from|sent\s+by))\s+([a-z][a-z0-9.-]*\.(?:xyz|top|club|online|site|tk|ml|ga|cf|gq|pw))/i,
    score: 14,
    severity: "high",
    category: "impersonation",
    title: "Suspicious sender domain",
    description: "Job offers from suspicious domains are often impersonation attempts.",
  },

  // G. PRESSURE / SOCIAL ENGINEERING
  {
    pattern: /\b(urgent\s+(hiring|need|action)|act\s+now|limited\s+(time|spot|position)|expire\s+(today|soon|in)|expires?\s+in\s+\d+\s*(hours?|days?))/i,
    score: 12,
    severity: "high",
    category: "urgency",
    title: "Urgency pressure",
    description: "Creating artificial urgency prevents careful evaluation and is a common scam tactic.",
  },
  {
    pattern: /\b(threaten|lose\s+(this\s+)?opportunity|dont\s+(miss|lose)\s+(out\s+on|this))/i,
    score: 10,
    severity: "medium",
    category: "urgency",
    title: "Threat of losing opportunity",
    description: "Threatening to take away an opportunity pressures victims into quick decisions.",
  },
  {
    pattern: /\b(bypass\s+(normal|standard)\s+(process|procedure|hiring)|skip\s+(the\s+)?interview)/i,
    score: 14,
    severity: "high",
    category: "social_engineering",
    title: "Bypassing normal procedures",
    description: "Instructions to bypass standard hiring procedures indicate manipulation.",
  },
];

// ─── Entity Extraction ─────────────────────────────────────────

function extractCompanyName(text: string): string | null {
  const patterns = [
    // "Hiring at COMPANY" or "We hired at COMPANY"
    /\b(hire(?:d|ing|s?)\s+at\s+)([A-Z][a-zA-Z0-9\s&\-\.]{2,50})(?=[\s,.;\n]|$)/i,
    // "COMPANY is hiring/looking/seeking"
    /\b([A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9\-\.]{2,}){0,4})\s+(?:is\s+(?:hiring|looking|seeking))/i,
    // "from COMPANY" / "by COMPANY" / "at COMPANY"
    /\b(?:from|by|at)\s+(?:the\s+)?([A-Z][a-zA-Z0-9\s&\-\.]{2,50})(?=\s+(?:\.|,|!|—|\-|\n|$))/i,
    // "Company: NAME" / "Organization: NAME"
    /\b(?:company|organization|firm|corp|inc|llc|ltd|co\.?)\s+[:\s]+([A-Z][a-zA-Z0-9\s&\-]{2,50})(?=[\s,.;]|$)/i,
    // "We are hiring at COMPANY" / "They hired at COMPANY"
    /\b(?:are|was|were|have|hired)\s+at\s+([A-Z][a-zA-Z0-9\s&\-\.]{2,50})(?=[\s,.;\n]|$)/i,
    // "Title - COMPANY" at end of line
    /-\s+([A-Z][a-zA-Z0-9\s&\-\.]{2,50})$/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    const name = m[1];
    if (name && name.trim().length > 2 && name.length < 100) return name.trim();
  }
  return null;
}

function extractJobTitle(text: string): string | null {
  const patterns = [
    // "Position: TITLE" or "Job title: TITLE"
    /\b(?:position|job\s+(title|role)|open\s+position)[:\s]+([A-Z][a-zA-Z0-9\s&\-]{2,60})(?:\.|,|—|\n|$)/i,
    // "hiring for TITLE" or "seeking a TITLE"
    /\b(hiring\s+for|looking\s+for|seeking\s+a)\s+(?:[a-z]+\s+)?([A-Z][a-zA-Z0-9\s&\-]{2,60})(?=[\s,.;]|$)/i,
    // "TITLE position" or "TITLE role"
    /\b([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\s+(?:position|role|opportunity)/i,
    // "Hiring: TITLE" at start or after newline
    /^(?:hiring|now\s+hiring):\s*([A-Z][a-zA-Z0-9\s&\-]{2,60})(?=[\n.,]|$)/mi,
    // Standalone title on its own line: "Senior Software Engineer" or "Title - Type"
    /^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,4}(?:\s*[-–—]\s*[A-Za-z\s]+)?)$/m,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    if (m[1] && m[1].trim().length > 2) {
      const title = m.slice(-1)[0]?.trim();
      if (title && title.length < 80) return title;
    }
  }
  return null;
}

function extractRecruiterInfo(text: string): { name: string | null; email: string | null; phone: string | null } {
  const emails = extractEmailsFromText(text);
  const phones = extractPhonesFromText(text);

  let recruiterName: string | null = null;
  const namePatterns = [
    /\b(?:recruiter|hr|hiring\s*manager|contact)[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /\b(sincerely|best\s+regards|kind\s+regards),?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    // "I'm NAME" or "Hello, I'm NAME"
    /\b(?:i'm|im)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    // "NAME from COMPANY" at start
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:from|at)\s+/mi,
  ];
  for (const p of namePatterns) {
    const m = text.match(p);
    if (!m) continue;
    if (m[1] && m[1].trim().length > 2) { recruiterName = m[1].trim(); break; }
  }

  return { name: recruiterName, email: emails[0] ?? null, phone: phones[0] ?? null };
}

function extractSalary(text: string): string | null {
  const match = text.match(/\$?(\d{1,3}(?:,\d{3})*)(?:\s*-\s*\$?(\d{1,3}(?:,\d{3})*))?(?:\s*(per\s+(hour|hourly|week|weekly|month|monthly|year|annually|annual))|\/(year|hour|week|month))/i);
  if (match) {
    const range = match[2] ? `${match[1]}-${match[2]}` : match[1];
    const period = match[3] || "period";
    return `$${range} ${period}`;
  }
  return null;
}

function extractRemoteStatus(text: string): "remote" | "onsite" | "hybrid" | null {
  if (/\b(?:fully?\s+remote|remote\s*(only|exclusively|position))/i.test(text)) return "remote";
  if (/\b(?:hybrid\s*(?:role|position|work))/i.test(text)) return "hybrid";
  if (/\b(?:on[- ]?site|in[- ]?office)/i.test(text)) return "onsite";
  return null;
}

function extractEmploymentType(text: string): string | null {
  const types = ["full-time", "part-time", "contract", "temporary", "freelance", "internship", "seasonal"];
  for (const t of types) {
    if (new RegExp(`\\b${t.replace(/-/g, "-?")}\\b`, "i").test(text)) return t;
  }
  return null;
}

function extractJobType(text: string): string | null {
  const types = ["entry-level", "mid-level", "senior", "lead", "manager", "director", "executive", "freelance", "contract"];
  for (const t of types) {
    if (new RegExp(`\\b${t}\\b`, "i").test(text)) return t;
  }
  return null;
}

// ─── Main Scanner ───────────────────────────────────────────────

export async function analyzeJob(input: string): Promise<ScanResult> {
  const inputPreview = createInputPreview(input, 200);
  const inputHash = await hashInput(input);

  // ── Entity extraction ──
  const extractedUrls = extractUrlsFromText(input);
  const extractedEmails = extractEmailsFromText(input);
  const extractedPhones = extractPhonesFromText(input);
  const { name: recruiterName, email: recruiterEmail, phone: recruiterPhone } = extractRecruiterInfo(input);
  const companyName = extractCompanyName(input);
  const jobTitle = extractJobTitle(input);
  const salaryRange = extractSalary(input);
  const remoteStatus = extractRemoteStatus(input);
  const employmentType = extractEmploymentType(input);
  const jobType = extractJobType(input);

  // ── Pattern matching ──
  const matchedPatterns: Array<{ pattern: JobScamPattern; match: string }> = [];
  for (const item of JOB_SCAM_PATTERNS) {
    const match = input.match(item.pattern);
    if (match) {
      matchedPatterns.push({ pattern: item, match: match[0] });
    }
  }

  // ── URL analysis ──
  const urlAnalysisResults: Array<{ url: string; score: number; riskLevel: string }> = [];
  for (const url of extractedUrls) {
    try {
      const urlResult = await analyzeUrl(url);
      if (urlResult.riskScore > 10) {
        urlAnalysisResults.push({
          url: urlResult.inputPreview,
          score: urlResult.riskScore,
          riskLevel: urlResult.riskLevel,
        });
      }
    } catch {
      // URL analysis failure is non-fatal
    }
  }

  // ── Score aggregation ──
  let totalScore = matchedPatterns.reduce((sum, { pattern }) => sum + pattern.score, 0);

  // Add score from embedded URL analysis
  for (const ua of urlAnalysisResults) {
    totalScore += Math.min(ua.score, 20); // Cap URL contribution
  }

  totalScore = Math.max(0, Math.min(100, totalScore));
  const riskLevel = getRiskLevel(totalScore);

  // ── Build indicators ──
  const indicators: RiskIndicator[] = matchedPatterns.map(({ pattern, match }) => ({
    severity: pattern.severity,
    category: pattern.category,
    title: pattern.title,
    description: pattern.description,
    evidence: `Found: "${match}"`,
  }));

  // Add URL findings as indicators
  for (const ua of urlAnalysisResults) {
    indicators.push({
      severity: ua.score >= 60 ? "high" : ua.score >= 40 ? "medium" : "low",
      category: "url_analysis",
      title: `Suspicious embedded URL (${ua.score}/100)`,
      description: `A URL found in the job content was flagged as ${ua.riskLevel}.`,
      evidence: ua.url,
    });
  }

  // Add suspicious email domain indicator
  for (const email of extractedEmails) {
    const domain = email.split("@")[1];
    if (domain && /\.(xyz|top|club|online|site|tk|ml|ga|cf|gq|pw)$/i.test(domain)) {
      indicators.push({
        severity: "medium",
        category: "domain",
        title: "Suspicious recruiter email domain",
        description: `The email domain "${domain}" is commonly associated with fraudulent activity.`,
        evidence: email,
      });
    }
  }

  // ── Positive indicators ──
  const positiveIndicators: RiskIndicator[] = [];
  const hasW2Reference = /\b(w2|w-2|form\s+(1099|w2)|tax\s+(withholding|documents))/i.test(input);
  const hasWorkFromHome = /\bwork\s+from\s+home\b/i.test(input) || /\bremote\s+(only|exclusively|position)\b/i.test(input);
  if (!hasWorkFromHome && hasW2Reference) {
    positiveIndicators.push({
      severity: "positive",
      category: "legitimacy",
      title: "Legitimate tax references",
      description: "References to W-2 or tax withholding suggest a formal employment arrangement.",
    });
  }
  if (companyName && !/\.(xyz|top|club|online|site|tk|ml|ga|cf|gq|pw)$/i.test(companyName)) {
    positiveIndicators.push({
      severity: "positive",
      category: "company",
      title: "Company name identified",
      description: `A company name was found in the posting: ${companyName}. Verify this company independently.`,
    });
  }
  if (jobTitle) {
    positiveIndicators.push({
      severity: "positive",
      category: "clarity",
      title: "Specific job title identified",
      description: `The posting includes a specific job title: ${jobTitle}.`,
    });
  }

  // Combine indicators
  const allIndicators = [...indicators, ...positiveIndicators];

  // ── Category determination ──
  const redFlagCategories = matchedPatterns.map((m) => m.pattern.category);
  const category = determineJobCategory(redFlagCategories, urlAnalysisResults);

  // ── Summary & recommendations ──
  const summary = generateJobSummary(totalScore, riskLevel, category, matchedPatterns.length, urlAnalysisResults.length);
  const recommendations = generateJobRecommendations(totalScore, riskLevel, matchedPatterns, urlAnalysisResults);

  // ── Job analysis result ──
  const jobAnalysis: JobAnalysisResult = {
    companyName,
    jobTitle,
    recruiterName,
    recruiterEmail,
    recruiterPhone,
    salaryRange,
    location: extractLocation(input),
    remoteStatus,
    employmentType,
    jobType,
    contactMethod: detectContactMethod(input),
    applicationMethod: extractApplicationMethod(input),
    extractedUrls: extractedUrls.length > 0 ? extractedUrls.slice(0, 10) : [],
    extractedEmails: extractedEmails.length > 0 ? extractedEmails.slice(0, 5) : [],
    extractedPhones: extractedPhones.length > 0 ? extractedPhones.slice(0, 5) : [],
    redFlags: matchedPatterns.map((m) => m.pattern.title),
    positiveSignals: positiveIndicators.map((i) => i.title),
    category,
    urlAnalysisResults,
  };

  const result: ScanResult = {
    id: crypto.randomUUID(),
    scanType: "job",
    inputPreview,
    inputHash,
    riskScore: totalScore,
    riskLevel: riskLevel.toLowerCase() as ScanResult["riskLevel"],
    category: category as ScanCategory | null,
    summary,
    indicators: allIndicators,
    recommendations,
    jobAnalysis,
    createdAt: new Date(),
  };

  // Fire AI analysis asynchronously (non-blocking)
  void runAiAnalysis(result);

  return result;
}

function extractLocation(text: string): string | null {
  const patterns = [
    /\b(?:location|place\s+of\s+work)[:\s]+([A-Z][a-zA-Z\s,.-]{2,60})(?:\.|,|—|$)/i,
    /\b(?:based\s+in|located\s+in)\s+([A-Z][a-zA-Z\s,.-]{2,40})/i,
    /\b([A-Z][a-z]{2,}(?:\s*,\s*[A-Z][a-z]{2,})?)\s+(?:is\s+(?:the\s+)?(?:location|workplace))/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    if (m[1] && m[1].trim().length > 2) return m[1].trim();
  }
  return null;
}

function detectContactMethod(text: string): string | null {
  if (/whatsapp/i.test(text)) return "whatsapp";
  if (/telegram/i.test(text)) return "telegram";
  if (/email/i.test(text) && /\b@/.test(text)) return "email";
  if (/phone|call/i.test(text) && /\+?[\d\s()-]{7,}/.test(text)) return "phone";
  return "unknown";
}

function extractApplicationMethod(text: string): string | null {
  if (/\b(apply\s+(via|through|at)|submit\s+(your\s+)?application)/i.test(text)) {
    const urlMatch = text.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/i);
    return urlMatch?.[0] || "link";
  }
  if (/\b(linkedIn|glassdoor|indeed|career\s+(site|page))/i.test(text)) return "job_board";
  return null;
}

function determineJobCategory(categories: string[], urlResults: { score: number }[]): string | null {
  const priority: Record<string, number> = {
    advance_fee: 0,
    task_scam: 1,
    reshipping_scam: 2,
    credential_theft: 3,
    impersonation: 4,
    urgency: 5,
    secrecy: 6,
    social_engineering: 7,
    unrealistic_claims: 8,
    suspicious_communication: 9,
    job_scam: 10,
  };

  const sorted = [...new Set(categories)].sort((a, b) => (priority[a] ?? 99) - (priority[b] ?? 99));
  if (sorted.length > 0) return sorted[0];

  // Check URL analysis
  if (urlResults.some((r) => r.score >= 60)) return "phishing";
  if (urlResults.length > 0) return "job_scam";

  return null;
}

function generateJobSummary(
  score: number,
  riskLevel: string,
  category: string | null,
  redFlagCount: number,
  urlFlagCount: number
): string {
  if (score >= 80) {
    return `This job posting shows strong indicators of being a fraudulent employment offer. ${category ? `${category.replace(/_/g, " ")} indicators were detected.` : ""} We strongly recommend avoiding this opportunity.`;
  }
  if (score >= 60) {
    return `This job posting contains several suspicious indicators commonly associated with employment scams. ${redFlagCount} red flag(s) and ${urlFlagCount} suspicious URL(s) were detected. Exercise caution and verify through official channels.`;
  }
  if (score >= 40) {
    return `This job posting has some concerning indicators. While not definitively fraudulent, we recommend verifying the company and opportunity through independent sources.`;
  }
  if (score >= 20) {
    return `This job posting has minor suspicious elements. Continue to practice standard due diligence when evaluating employment opportunities.`;
  }
  return `No significant scam indicators were detected in this job posting. However, always verify employment offers through official company channels before sharing personal information or making payments.`;
}

function generateJobRecommendations(
  score: number,
  riskLevel: string,
  patterns: Array<{ pattern: JobScamPattern }>,
  urlResults: Array<{ url: string; score: number }>
): string[] {
  const recs: string[] = [];

  if (score >= 60) {
    recs.push("Do not send money, pay fees, or provide payment information to this employer.");
    recs.push("Do not share your SSN, bank account, or government ID until you have verified the employer through official channels.");
  }

  const categories = new Set(patterns.map((p) => p.pattern.category));

  if (categories.has("advance_fee")) {
    recs.push("Legitimate employers never require upfront payments. Do not pay any fees associated with this opportunity.");
  }
  if (categories.has("task_scam") || categories.has("reshipping_scam")) {
    recs.push("Do not agree to handle money transfers, packages, or checks on behalf of the employer. This is a criminal scheme.");
  }
  if (categories.has("credential_theft")) {
    recs.push("Never share passwords, OTP codes, or banking credentials with a prospective employer.");
  }
  if (categories.has("urgency")) {
    recs.push("Scammers create false urgency. Take your time to research the company and verify the opportunity independently.");
  }
  if (categories.has("impersonation")) {
    recs.push("Verify the recruiter's identity by contacting the company directly through its official website or phone number.");
  }
  if (urlResults.length > 0) {
    recs.push("Some URLs in the posting were flagged as suspicious. Do not click them without independent verification.");
  }

  if (score < 40) {
    recs.push("Verify the company through its official website and LinkedIn profile.");
    recs.push("Research the company on Glassdoor, Indeed, or the Better Business Bureau.");
  }

  return recs.length > 0 ? recs : ["Continue to practice standard due diligence when evaluating any job opportunity."];
}

/**
 * Fire AI analysis in background (non-blocking).
 * Results are saved to DB independently of the scan result.
 */
async function runAiAnalysis(result: ScanResult): Promise<void> {
  try {
    const context = {
      scanType: "job" as const,
      inputPreview: result.inputPreview,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      category: result.category,
      summary: result.summary,
      indicators: result.indicators.map((ind) => ({
        severity: ind.severity,
        category: ind.category,
        title: ind.title,
        description: ind.description,
        evidence: ind.evidence,
      })),
    };

    const { aiResult, adjustedScore } = await analyzeWithAi(context, result.id);

    if (aiResult && adjustedScore !== result.riskScore) {
      try {
        const { prisma } = await import("@/lib/db");
        await prisma.scan.update({
          where: { id: result.id },
          data: { riskScore: adjustedScore, riskLevel: getRiskLevelFromScore(adjustedScore) },
        });
      } catch {
        // Non-fatal: deterministic score remains
      }
    }
  } catch {
    // AI analysis failure is non-fatal — deterministic result is preserved
  }
}

function getRiskLevelFromScore(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  if (score >= 20) return "low";
  return "minimal";
}
