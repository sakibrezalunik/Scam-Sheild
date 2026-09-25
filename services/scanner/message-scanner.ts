import { MessageAnalysisResult, ScanResult, RiskIndicator, Severity } from "@/types/scan";
import { createInputPreview, extractUrlsFromText, extractEmailsFromText, extractPhonesFromText, hashInput } from "@/services/security/input-validator";
import { getRiskLevel } from "@/services/scoring/risk-engine";
import { analyzeWithAi } from "@/services/ai/ai-analyzer";

export interface MessageScanOptions {
  userId?: string;
  messageType?: "sms" | "email" | "social" | "messenger";
}

// Scam patterns and their weights
const SCAM_PATTERNS = [
  // Urgency patterns
  { pattern: /urgent|immediately|right now|right away|act now|hurry|expires(?:\s+(today|soon|in\s+\d+\s+(hours?|days?|minutes?)))/i, score: 10, severity: "high" as Severity, category: "urgency", title: "Urgency language detected", description: "The message creates artificial urgency to pressure you into acting quickly without thinking." },
  { pattern: /\bfinal\s+(notice|warning|alert)\b/i, score: 8, severity: "high" as Severity, category: "urgency", title: "Final notice intimidation", description: "Final notices demanding action are common scam tactics used to pressure victims." },
  { pattern: /your (account|card|subscription) (has been|will be) (suspended|locked|closed|cancelled)/i, score: 14, severity: "high" as Severity, category: "threat", title: "Account threat detected", description: "The message threatens negative consequences to your account. Legitimate companies rarely use threats." },
  { pattern: /(subscription|membership).*(cancelled|cancellation).*?(update|payment|info)/i, score: 10, severity: "high" as Severity, category: "threat", title: "Subscription cancellation threat", description: "Threatening subscription cancellation to force payment updates is a common phishing tactic." },
  { pattern: /(verify|confirm) your (account|identity|information) (now|immediately|within)/i, score: 8, severity: "high" as Severity, category: "urgency", title: "Verification pressure", description: "The message pressures you to verify information urgently. This is a common phishing tactic." },
  { pattern: /(account|verification).*(expir|expire|expiring)/i, score: 10, severity: "high" as Severity, category: "urgency", title: "Account expiry threat", description: "Threatening account expiration is a common phishing tactic to create urgency." },
  { pattern: /suspicious activity.*(verify|click|link|identity)/i, score: 10, severity: "high" as Severity, category: "phishing", title: "Suspicious activity phishing", description: "Claiming suspicious account activity to prompt urgent action is a classic phishing tactic." },
  { pattern: /\b(transfer|send) (funds|money|\$[0-9,]+) (to|for|on behalf of|via)\b/i, score: 20, severity: "critical" as Severity, category: "money_mule", title: "Fund transfer request", description: "Requests to transfer funds, especially on behalf of others, are classic money mule scam indicators." },
  { pattern: /reimbursed?.*within.*\d+\s*(hours?|days?)/i, score: 14, severity: "high" as Severity, category: "money_mule", title: "Promise of reimbursement", description: "Promising reimbursement for a transfer is a classic money mule tactic to build trust." },
  { pattern: /\breimburse.*?(you|me).*(next\s+(week|month)|soon|shortly)/i, score: 8, severity: "medium" as Severity, category: "money_mule", title: "Reimbursement promise", description: "Promising future reimbursement is a classic money mule tactic to build trust." },
  { pattern: /\bon\s+behalf\s+of\s+(our\s+)?company\b/i, score: 10, severity: "high" as Severity, category: "money_mule", title: "Corporate account use request", description: "Asking someone to use their personal account for company business is a classic money mule tactic." },

  // Financial scams
  { pattern: /you('ve| have) (won|been selected|qualified for).*?(prize|reward|lottery|jackpot|inheritance)/i, score: 20, severity: "critical" as Severity, category: "prize_scam", title: "Prize/lottery scam language", description: "Messages claiming you've won something are almost always scams, especially if you never entered a contest." },
  { pattern: /selected to receive.*?(prize|reward|lottery|jackpot|inheritance)/i, score: 15, severity: "critical" as Severity, category: "prize_scam", title: "Prize/lottery scam language", description: "Messages claiming you've been selected for a prize are almost always scams." },
  { pattern: /\b(congratulations|congrats).*?(won|prize|reward|lottery|claim)/i, score: 10, severity: "high" as Severity, category: "prize_scam", title: "Congratulations prize lure", description: "Congratulations paired with a prize or reward claim is a classic advance-fee scam." },
  { pattern: /transfer (funds|money|\$[0-9,]+) (to|for|on behalf of)/i, score: 12, severity: "high" as Severity, category: "money_mule", title: "Money transfer request", description: "Requests to transfer money are often money mule scams. Never transfer money for strangers." },
  { pattern: /(wire|western union|moneygram|bitcoin|cryptocurrency|gift card|itunes|google play) (transfer|payment|send|via|request)/i, score: 15, severity: "critical" as Severity, category: "payment_method", title: "Suspicious payment method", description: "Requests for payment via wire transfer, cryptocurrency, or gift cards are major red flags for scams." },
  { pattern: /\$[0-9,]+ (gift card|google play|itunes)/i, score: 12, severity: "high" as Severity, category: "prize_scam", title: "Gift card payment demand", description: "Being asked to pay with gift cards is a hallmark of advance-fee and prize scams." },
  { pattern: /(google play|itunes|gift card) (gift card|card)/i, score: 14, severity: "high" as Severity, category: "prize_scam", title: "Gift card redemption scam", description: "Being told to redeem a prize via gift card is a common advance-fee scam." },
  { pattern: /\b(won|selected|prize).*?\$?\d+.*?(gift\s+card|amazon\s+gift|google\s+play)/i, score: 24, severity: "critical" as Severity, category: "prize_scam", title: "Gift card prize lure", description: "Claims of winning a gift card are almost always advance-fee scams designed to extract payment." },
  { pattern: /(nigerian|prince|inheritance|beneficiary|deceased)/i, score: 20, severity: "critical" as Severity, category: "advance_fee", title: "Advance fee scam indicators", description: "This message contains patterns common in advance fee scams (Nigerian prince style scams)." },
  { pattern: /\$[0-9,]+ (processing|administrative|registration|verification|activation) fee/i, score: 12, severity: "high" as Severity, category: "advance_fee", title: "Advance fee request", description: "Being asked to pay a fee to receive money or a prize is a classic advance-fee scam." },
  { pattern: /send (money|payment| funds) via (western union|moneygram|wire|cash app|venmo|paypal)/i, score: 15, severity: "critical" as Severity, category: "payment_method", title: "Payment via irreversible method", description: "Requests to send money via irreversible methods are a major red flag for scams." },

  // Random winner / prize lure variants
  { pattern: /\b(randomly\s+selected|chosen.*winner|weekly\s+winner|instant\s+winner).*?(\$?\d+[\w,]*)/i, score: 18, severity: "critical" as Severity, category: "prize_scam", title: "Random winner lure", description: "Claims of being randomly selected for a prize without entering a contest are advance-fee scams." },
  { pattern: /\b(shipping and handling|shipping fee|handling charge).*?(prize|claim|won|gift|redeem)/i, score: 12, severity: "high" as Severity, category: "advance_fee", title: "Shipping fee prize lure", description: "Being asked to pay shipping to claim a prize is a classic advance-fee scam." },
  { pattern: /\b(pay|paying|payment).*?(shipping|handling|fee).*?(claim|win|prize|won|gift)/i, score: 8, severity: "high" as Severity, category: "advance_fee", title: "Pay to claim prize", description: "Paying money to claim a prize or winnings is a classic advance-fee scam structure." },

  // Account threat variants
  { pattern: /\b(account).*?(will be|is going to be)?.*(deleted|suspended|closed|lost).*?(\d+\s*(hours?|days?))/i, score: 16, severity: "high" as Severity, category: "threat", title: "Account deletion threat", description: "Threatening account deletion within a time limit is a common phishing tactic." },

  // Geographic login anomaly
  { pattern: /\b(unusual|suspicious).*(login|activity).*(from|detected|in)/i, score: 12, severity: "high" as Severity, category: "phishing", title: "Geographic login anomaly", description: "Alerts about unusual login locations are often phishing attempts to steal credentials." },

  // Government agency impersonation variants
  { pattern: /\b(social\s+security|ssn|administration).*?(suspended|frozen|restricted|terminated|closed)/i, score: 18, severity: "critical" as Severity, category: "authority", title: "SSA/SSN suspension threat", description: "Claims that your SSN or Social Security is suspended are always scams. The SSA never suspends SSNs." },
  { pattern: /\b(dmv|department of motor vehicles|license).*?(suspended|revoked|expired).*?(pay|fee|fine|reinstat)/i, score: 16, severity: "high" as Severity, category: "authority", title: "DMV license suspension threat", description: "Threats about driver license suspension requiring payment are common scams. DMVs do not demand payment via text/email." },
  { pattern: /\b(attorney general|ag\s+office|justice department).*?(investigation|indictment|charges|under investigation)/i, score: 20, severity: "critical" as Severity, category: "authority", title: "Attorney General impersonation", description: "Impersonating the Attorney General or federal justice department is a known scam tactic." },

  // Delivery scam variants
  { pattern: /\b(usps|ups|fedex|dhl).*?(delivery|attempt|failed|customs).*?\$[0-9.]+/i, score: 14, severity: "high" as Severity, category: "delivery_scam", title: "Carrier delivery fee scam", description: "Fake carrier notifications demanding small fees are phishing attempts." },
  { pattern: /\b(customs|delivery fee|postage due|handling fee).*?\$[0-9.]+.*?(pay|click|claim)/i, score: 12, severity: "high" as Severity, category: "delivery_scam", title: "Delivery customs fee demand", description: "Demands for small customs or delivery fees via link are phishing tactics." },

  // Money mule variants
  { pattern: /\b(deposit|receive|process).*(payment|fund|money|transaction).*?(forward|send on|route)/i, score: 18, severity: "critical" as Severity, category: "money_mule", title: "Payment forwarding request", description: "Asking someone to receive and forward payments is a classic money mule tactic." },
  { pattern: /\b(deposit|receive).*(payment|fund|money|transaction).*(on\s+behalf|for\s+our|for\s+client|forward)/i, score: 16, severity: "high" as Severity, category: "money_mule", title: "Payment forwarding on behalf", description: "Receiving payments on behalf of others is a classic money mule indicator." },
  { pattern: /\b(corporate|company|business).*(bank account|account).*?(process|handle|transfer).*payment/i, score: 16, severity: "high" as Severity, category: "money_mule", title: "Corporate account mule request", description: "Using personal accounts for corporate payments is a money mule indicator." },

  // Windows / tech support alert
  { pattern: /\b(windows|pc|computer).*?security\s+alert.*?(download|scanner|fix|solve)/i, score: 20, severity: "critical" as Severity, category: "tech_support", title: "Fake security alert download", description: "Fake security alerts urging you to download software are tech support scams." },

  // Credential theft
  { pattern: /click (here|below|this link) to (verify|confirm|update|secure|unlock)/i, score: 10, severity: "high" as Severity, category: "phishing", title: "Phishing link language", description: "The message encourages clicking a link to verify or update information - a common phishing tactic." },
  { pattern: /click (here|below|this link) (to |for |and )/i, score: 6, severity: "medium" as Severity, category: "phishing", title: "Suspicious link instruction", description: "The message asks you to click a link, which may lead to a phishing site." },
  { pattern: /(password|pin|otp|one.time password|verification code|security code) (is|:) ?[0-9]{4,8}/i, score: 6, severity: "medium" as Severity, category: "otp", title: "Contains OTP/code", description: "This message contains a one-time password or verification code. Never share codes with anyone." },
  { pattern: /(we |your bank|your account) (need|require|request) (your )?(password|pin|ssn|social security)/i, score: 20, severity: "critical" as Severity, category: "credential_theft", title: "Credential request", description: "Legitimate organizations never ask for your password, PIN, or SSN via message." },
  { pattern: /enter(?:ed|ing)?\s+(your\s+)?(password|pin|ssn|social security|bank account|credit card)/i, score: 15, severity: "critical" as Severity, category: "credential_theft", title: "Credential entry request", description: "Asking you to enter sensitive information on a link is a phishing attempt." },
  { pattern: /(confirm|update|verify).*?(your\s+)?(account|details|information|identity).*?at\s+(https?:\/\/|click\s+here|this\s+link)/i, score: 8, severity: "high" as Severity, category: "credential_theft", title: "Account confirmation lure", description: "Asking you to confirm details at an external link is a credential harvesting tactic." },
  { pattern: /(ssn|social security number|bank account|credit card|full name|date of birth).*(verify|confirm|set up|direct deposit|identity)/i, score: 15, severity: "critical" as Severity, category: "credential_theft", title: "Credential verification trap", description: "Requesting personal details for 'verification' or 'setup' is a credential harvesting tactic." },

  // Romance/dating scams
  { pattern: /(dear|hello|hi) (friend|sweetheart|darling|love),/i, score: 5, severity: "medium" as Severity, category: "romance", title: "Unusual greeting style", description: "Overly familiar greetings from strangers can indicate romance scams." },
  { pattern: /(i am|am) (a |an )?(soldier|doctor|surgeon|engineer|pilot|contractor|military) (working|stationed|deployed|based) (in|overseas)/i, score: 10, severity: "high" as Severity, category: "romance", title: "Military/professional persona", description: "Claims of being deployed military or working overseas are common in romance scams." },
  { pattern: /(i want|would like) to (meet|visit|come to) you (but|however) (i need|require)|need (you to )?send (me )?money/i, score: 12, severity: "high" as Severity, category: "romance", title: "Travel money request pattern", description: "Requests for money to visit you are a classic romance scam pattern." },
  { pattern: /will pay (you back|you) (double|back)(?!.*legitimate)/i, score: 8, severity: "medium" as Severity, category: "romance", title: "Promise of repayment", description: "Promising to repay double is a common romance scam tactic to build trust." },
  { pattern: /\b(fell\s+in\s+love|falling\s+in\s+love).*(need|want|require).*(\$?\d+|money|fund)/i, score: 16, severity: "high" as Severity, category: "romance", title: "Romance money request", description: "Claims of love followed by requests for money are classic romance scam indicators." },

  // Job scams
  { pattern: /(work from home|remote job|data entry|personal assistant) (opportunity|position|job)/i, score: 6, severity: "medium" as Severity, category: "job_scam", title: "Work from home offer", description: "Unsolicited work-from-home offers are often scams. Legitimate jobs don't come via random messages." },
  { pattern: /(earn|make) \$[0-9,]+ (per|a|every) (week|day|hour|month)/i, score: 10, severity: "high" as Severity, category: "job_scam", title: "Unrealistic income claim", description: "Promises of high earnings with little work are typical of job scams." },
  { pattern: /\$[0-9,]+ (per|a|every) (week|day|hour|month).*?(no\s+experience|no\s+skills|easy\s+money)/i, score: 10, severity: "high" as Severity, category: "job_scam", title: "High pay no experience", description: "Promises of high pay with no experience required is a classic job scam indicator." },
  { pattern: /\blimited\s+time\s+(offer|deal|promotion)\b/i, score: 6, severity: "medium" as Severity, category: "urgency", title: "Limited time pressure", description: "Artificial time limits are commonly used in scams to presssure quick decisions." },
  { pattern: /\b(50% off|half price|free.*shipping|discount|sale)\b.*\b(shop|buy|order|now)\b/i, score: 5, severity: "medium" as Severity, category: "urgency", title: "Sales urgency pressure", description: "Aggressive sales language combined with urgency is common in both marketing and scams." },
  { pattern: /(whatsapp|telegram|signal) (only|for|interview|contact)/i, score: 8, severity: "high" as Severity, category: "job_scam", title: "Messaging app communication", description: "Legitimate companies don't conduct interviews only via messaging apps like WhatsApp or Telegram." },

  // Authority impersonation
  { pattern: /\b(irs|internal revenue service)\b.*\b(refund|tax.*return|claimed|pending)\b/i, score: 20, severity: "critical" as Severity, category: "authority", title: "IRS/tax refund impersonation", description: "The IRS never initiates contact about refunds via email or text. This is a known scam pattern." },
  { pattern: /\b(irs|internal revenue service|tax refund)\b.*\$[0-9,]+/i, score: 10, severity: "high" as Severity, category: "authority", title: "IRS refund with dollar amount", description: "IRS refund offers with specific dollar amounts are a known scam pattern." },
  { pattern: /\b(irs|internal revenue service|tax|federal|government|police|fbi|court|legal|authorities)\b/i, score: 10, severity: "high" as Severity, category: "authority", title: "Authority reference", description: "References to government or legal authority are used to intimidate victims. Verify through official channels." },
  { pattern: /(arrest|warrant|lawsuit|legal action|criminal) (will be|pending|against you)|your warrant is/i, score: 20, severity: "critical" as Severity, category: "threat", title: "Legal threat detected", description: "Threats of arrest or legal action via text/email are almost always scams. Real authorities use official mail." },
  { pattern: /pay\s+\$[0-9,]+ (fine|bond|bail|fee) (immediately|now|today)|pay (your )?fine (to|via|before)/i, score: 20, severity: "critical" as Severity, category: "threat", title: "Demand for payment under threat", description: "Demanding payment to avoid arrest or legal action is a common scam tactic." },
  { pattern: /pay\s+\$[0-9,]+\s+(fine|bond|fee|reinstatement|amount).*?(or|before|to).*?(face|avoid|prevent|stop|risk)/i, score: 12, severity: "high" as Severity, category: "threat", title: "Payment to avoid penalty", description: "Demanding payment to avoid legal or financial consequences is a common scam tactic." },

  // Technical support scams
  { pattern: /(your computer|pc|device|laptop) (is|has been) (infected|compromised|hacked|blocked|virus)/i, score: 20, severity: "critical" as Severity, category: "tech_support", title: "Tech support scam language", description: "Claims that your device is infected are tech support scams. Microsoft, Apple, etc. don't send these messages." },
  { pattern: /(microsoft|apple|google|amazon|windows) (support|team|security)(?!.*legitimate)/i, score: 15, severity: "critical" as Severity, category: "tech_support", title: "Impersonates tech company", description: "Tech companies don't proactively contact users about infections. This is a tech support scam." },
  { pattern: /call\s+(us|me|now|microsoft|support).*\d{3}[-.\s]\d{3}[-.\s]\d{4}/i, score: 15, severity: "high" as Severity, category: "tech_support", title: "Tech support phone number", description: "Unsolicited messages with a support phone number to call are a common tech support scam." },
  { pattern: /\bcall\s+(?:1[-.\s])?(\d{3}[-.\s]\d{3}[-.\s]\d{4})\b/i, score: 10, severity: "high" as Severity, category: "tech_support", title: "Scam callback number", description: "Unsolicited messages directing you to call a phone number are common scam tactics." },

  // Suspicious communication methods
  { pattern: /do not (reply|respond|tell|inform|share|discuss) (to anyone|anyone|with anyone)|don't (tell|inform|share) (anyone|them|us)/i, score: 10, severity: "high" as Severity, category: "secrecy", title: "Secrecy request", description: "Asking you not to tell anyone is a major red flag. Legitimate requests don't require secrecy." },

  // Delivery/package scams
  { pattern: /\b(delivery|package|shipment).*?(failed|unsuccessful|attempted|unable|missing)\b/i, score: 14, severity: "high" as Severity, category: "phishing", title: "Delivery failure claim", description: "Fake delivery notifications are used to lure victims into clicking malicious links." },
  { pattern: /\b(delivery|package|shipment).*?(failed|unable|attempted).*?(click|visit|link)/i, score: 10, severity: "high" as Severity, category: "phishing", title: "Delivery scam with link CTA", description: "Delivery failure combined with a link instruction is a classic phishing structure." },
  { pattern: /click\s+(here|below|this link)\s+(to\s+)?(reschedule|track|claim|update|verify)/i, score: 10, severity: "high" as Severity, category: "phishing", title: "Malicious link instruction", description: "Instructions to click a link to take action are common in phishing messages." },
  { pattern: /reschedule (your )?(delivery|appointment|pickup)/i, score: 6, severity: "medium" as Severity, category: "phishing", title: "Delivery reschedule request", description: "Requests to reschedule deliveries via a link are often phishing attempts." },
];

export async function analyzeMessage(input: string, options: MessageScanOptions = {}): Promise<ScanResult> {
  const inputPreview = createInputPreview(input);
  const inputHash = await hashInput(input);

  // Detect message type
  const messageType = options.messageType || detectMessageType(input);

  // Extract entities
  const detectedUrls = extractUrlsFromText(input);
  const detectedEmails = extractEmailsFromText(input);
  const detectedPhones = extractPhonesFromText(input);

  // Analyze patterns
  const matchedPatterns: Array<{ pattern: typeof SCAM_PATTERNS[0]; match: string }> = [];
  for (const item of SCAM_PATTERNS) {
    const match = input.match(item.pattern);
    if (match) {
      matchedPatterns.push({ pattern: item, match: match[0] });
    }
  }

  // Calculate score
  let totalScore = matchedPatterns.reduce((sum, { pattern }) => sum + pattern.score, 0);

  // Add score for detected URLs in suspicious context
  if (detectedUrls.length > 0 && matchedPatterns.some(m =>
    ["phishing", "urgency", "prize_scam", "tech_support", "authority", "threat", "money_mule", "advance_fee", "credential_theft", "romance", "delivery_scam", "payment_method"].includes(m.pattern.category)
  )) {
    totalScore += 5;
  }

  // Clamp score
  totalScore = Math.max(0, Math.min(100, totalScore));
  const riskLevel = getRiskLevel(totalScore);

  // Build indicators
  const indicators: RiskIndicator[] = matchedPatterns.map(({ pattern, match }) => ({
    severity: pattern.severity,
    category: pattern.category,
    title: pattern.title,
    description: pattern.description,
    evidence: `Found: "${match}"`,
  }));

  // Add URL warning if present
  if (detectedUrls.length > 0) {
    indicators.push({
      severity: totalScore > 40 ? "high" : "medium",
      category: "links",
      title: "Contains links",
      description: "This message contains links. Be cautious about clicking links in unsolicited messages. Hover over links to preview the destination before clicking.",
      evidence: `Found ${detectedUrls.length} link(s)`,
    });
  }

  // Determine category
  const categories = matchedPatterns.map(m => m.pattern.category);
  const category = determineCategory(categories);

  // Generate summary
  const summary = generateMessageSummary(totalScore, riskLevel, category, matchedPatterns.length);

  // Generate recommendations
  const recommendations = generateMessageRecommendations(totalScore, indicators, detectedUrls);

  const messageAnalysis: MessageAnalysisResult = {
    messageType,
    detectedLinks: detectedUrls,
    detectedPhones: detectedPhones,
    detectedEmails: detectedEmails,
    detectedUrls,
    language: null,
  };

  const result: ScanResult = {
    id: crypto.randomUUID(),
    scanType: "message",
    inputPreview,
    inputHash,
    riskScore: totalScore,
    riskLevel: riskLevel.toLowerCase() as ScanResult["riskLevel"],
    category,
    summary,
    indicators,
    recommendations,
    messageAnalysis,
    createdAt: new Date(),
  };

  // Fire AI analysis asynchronously (non-blocking)
  void runAiAnalysis(result);

  return result;
}

function detectMessageType(input: string): "sms" | "email" | "social" | "messenger" | "unknown" {
  // Email indicators
  if (input.includes("@") && (input.includes("Subject:") || input.includes("From:") || input.includes("To:"))) {
    return "email";
  }
  // SMS indicators (short, contains phone number references)
  if (input.length < 500 && /[0-9]{10,}/.test(input)) {
    return "sms";
  }
  // Social media indicators
  if (input.includes("friend request") || input.includes("sent you a message") || input.includes("mentioned you")) {
    return "social";
  }
  return "unknown";
}

import type { ScanCategory } from "@/types/scan";

function determineCategory(categories: string[]): ScanCategory {
  const priority: ScanCategory[] = ["credential_theft", "prize_scam", "tech_support", "advance_fee", "phishing", "romance", "job_scam", "money_mule", "threat", "urgency"];
  for (const cat of priority) {
    if (categories.includes(cat)) return cat;
  }
  return "suspicious_message";
}

/**
 * Fire AI analysis in background (non-blocking).
 */
async function runAiAnalysis(result: ScanResult): Promise<void> {
  try {
    const context = {
      scanType: "message" as const,
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateMessageSummary(score: number, riskLevel: string, category: string | null, patternCount: number): string {
  if (score >= 80) {
    return "This message shows multiple strong indicators of being a scam. We strongly recommend deleting it and not responding.";
  }
  if (score >= 60) {
    return "This message contains several suspicious patterns commonly used in scams. Exercise caution and do not respond or click any links.";
  }
  if (score >= 40) {
    return "This message has some concerning indicators. Be cautious and verify through official channels before taking any action.";
  }
  if (score >= 20) {
    return "This message has some minor suspicious elements. While it may be legitimate, always verify unexpected requests through official channels.";
  }
  return "No significant scam indicators were detected. However, always be cautious with unsolicited messages requesting personal information or action.";
}

function generateMessageRecommendations(score: number, indicators: RiskIndicator[], urls: string[]): string[] {
  const recommendations: string[] = [];

  if (score >= 60) {
    recommendations.push("Do not reply to this message or click any links.");
    recommendations.push("Block the sender and report as spam.");
  }

  if (indicators.some(i => i.category === "credential_theft")) {
    recommendations.push("Never share passwords, PINs, or verification codes via message.");
  }

  if (indicators.some(i => i.category === "prize_scam")) {
    recommendations.push("If you didn't enter a contest, you didn't win anything. This is a scam.");
  }

  if (indicators.some(i => i.category === "tech_support")) {
    recommendations.push("Legitimate tech companies don't contact users about infections. Ignore and delete this message.");
  }

  if (urls.length > 0) {
    recommendations.push("Do not click any links in this message. Navigate directly to websites by typing the address yourself.");
  }

  if (indicators.some(i => i.category === "urgency" || i.category === "threat")) {
    recommendations.push("Take time to verify claims through official channels. Scammers create urgency to prevent you from thinking clearly.");
  }

  if (score < 40) {
    recommendations.push("If you're unsure about a message, contact the organization directly using official contact information.");
  }

  return recommendations;
}
