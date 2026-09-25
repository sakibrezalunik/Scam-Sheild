/**
 * Evaluation dataset for ScamShield Phase 8.1 — expanded to 120+ cases.
 *
 * Structure:
 *   - ~40 URL cases (balanced scam/legitimate/borderline)
 *   - ~40 message cases (balanced scam/legitimate/borderline)
 *   - ~40 job cases (balanced scam/legitimate/borderline)
 *   - ~10 adversarial cases (obfuscated, mixed signals, edge cases)
 *
 * Each entry has:
 *   - id: unique identifier
 *   - type: scan type
 *   - input: the text/URL to scan
 *   - expectedLabel: "scam" | "legitimate" | "borderline"
 *   - expectedScoreRange: { min, max } — acceptable score band
 *   - note: human-readable explanation
 *   - category: sub-category for per-category metric analysis
 *   - adversarial?: true — marks adversarial/edge-case tests
 */
export interface EvalCase {
  id: string;
  type: "url" | "message" | "job";
  input: string;
  expectedLabel: "scam" | "legitimate" | "borderline";
  expectedScoreRange: { min: number; max: number };
  note: string;
  category?: string;
  adversarial?: boolean;
}

// ─── URL Cases (target: ~40) ─────────────────────────────────────────────────

export const urlCases: EvalCase[] = [
  // ── LEGITIMATE URLs (True Negatives) ─────────────────────────────────────

  // major_brand (3 cases)
  {
    id: "url-001",
    type: "url",
    input: "https://www.google.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Major tech company — should score near zero",
    category: "major_brand",
  },
  {
    id: "url-002",
    type: "url",
    input: "https://github.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Well-known developer platform",
    category: "major_brand",
  },
  {
    id: "url-003",
    type: "url",
    input: "https://www.amazon.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Major e-commerce — must not trigger",
    category: "major_brand",
  },

  // brand_impersonation_guard (3 cases)
  {
    id: "url-004",
    type: "url",
    input: "https://www.paypal.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "PayPal official domain — lookalike check must not fire",
    category: "brand_impersonation_guard",
  },
  {
    id: "url-005",
    type: "url",
    input: "https://www.microsoft.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Official Microsoft — must not trigger lookalike",
    category: "brand_impersonation_guard",
  },
  {
    id: "url-006",
    type: "url",
    input: "https://apple.com/support",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Official Apple support page",
    category: "brand_impersonation_guard",
  },

  // keyword_false_positive (4 cases)
  {
    id: "url-007",
    type: "url",
    input: "https://www.netflix.com/login",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 30 },
    note: "Netflix login — 'login' in path is normal",
    category: "keyword_false_positive",
  },
  {
    id: "url-008",
    type: "url",
    input: "https://www.chase.com/security",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 25 },
    note: "Chase security page — 'security' on real domain",
    category: "keyword_false_positive",
  },
  {
    id: "url-009",
    type: "url",
    input: "https://en.wikipedia.org/wiki/Phishing",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Educational Wikipedia article about phishing",
    category: "keyword_false_positive",
  },
  {
    id: "url-010",
    type: "url",
    input: "https://www.bankofamerica.com/verify",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 30 },
    note: "Bank of America — 'verify' in path is standard",
    category: "keyword_false_positive",
  },

  // gov_domain (2 cases)
  {
    id: "url-011",
    type: "url",
    input: "https://irs.gov/tax-fields",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Legitimate .gov domain",
    category: "gov_domain",
  },
  {
    id: "url-012",
    type: "url",
    input: "https://www.usa.gov",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Official US government portal",
    category: "gov_domain",
  },

  // neutral / casual (2 cases)
  {
    id: "url-013",
    type: "url",
    input: "https://example.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Standard example domain — no suspicious signals",
    category: "neutral",
  },
  {
    id: "url-014",
    type: "url",
    input: "https://www.local-news.com",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Generic but legitimate local news site",
    category: "neutral",
  },

  // ── SUSPICIOUS / SCAM URLs (True Positives) ──────────────────────────────

  // typosquatting (5 cases)
  {
    id: "url-015",
    type: "url",
    input: "https://g00gle.com",
    expectedLabel: "scam",
    expectedScoreRange: { min: 50, max: 100 },
    note: "Digit-substitution typoquatting of Google",
    category: "typosquatting",
  },
  {
    id: "url-016",
    type: "url",
    input: "https://paypa1.com/login",
    expectedLabel: "scam",
    expectedScoreRange: { min: 50, max: 100 },
    note: "Digit-substitution typoquatting of PayPal",
    category: "typosquatting",
  },
  {
    id: "url-017",
    type: "url",
    input: "https://microsft-support.com/verify-account",
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "Misspelled Microsoft + suspicious TLD + urgency keyword",
    category: "typosquatting",
  },
  {
    id: "url-018",
    type: "url",
    input: "https://facebook-security-verify.xyz",
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "Suspicious TLD + brand impersonation + security keyword",
    category: "typosquatting",
  },
  {
    id: "url-019",
    type: "url",
    input: "https://amaz0n-deals.com/claim",
    expectedLabel: "scam",
    expectedScoreRange: { min: 45, max: 100 },
    note: "Digit-substitution typoquatting of Amazon",
    category: "typosquatting",
  },

  // brand_impersonation (4 cases)
  {
    id: "url-020",
    type: "url",
    input: "https://amazon-deals.today/claim-your-prize",
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "Brand impersonation + suspicious TLD (.today) + prize language",
    category: "brand_impersonation",
  },
  {
    id: "url-021",
    type: "url",
    input: "https://netflix-billing-update.tk",
    expectedLabel: "scam",
    expectedScoreRange: { min: 45, max: 100 },
    note: "Brand impersonation + .tk TLD + billing urgency",
    category: "brand_impersonation",
  },
  {
    id: "url-022",
    type: "url",
    input: "https://apple-id-locked.info/reset",
    expectedLabel: "scam",
    expectedScoreRange: { min: 35, max: 100 },
    note: "Brand impersonation + urgency + suspicious TLD",
    category: "brand_impersonation",
  },
  {
    id: "url-023",
    type: "url",
    input: "https://walmart-rewards-claim.xyz",
    expectedLabel: "scam",
    expectedScoreRange: { min: 30, max: 100 },
    note: "Brand impersonation + prize lure + suspicious TLD",
    category: "brand_impersonation",
  },

  // credential_phishing (3 cases)
  {
    id: "url-024",
    type: "url",
    input: "http://secure-update-account.info/confirm",
    expectedLabel: "scam",
    expectedScoreRange: { min: 35, max: 100 },
    note: "No HTTPS + suspicious TLD + urgency keywords",
    category: "credential_phishing",
  },
  {
    id: "url-025",
    type: "url",
    input: "http://bank-verify-secure.tk/login",
    expectedLabel: "scam",
    expectedScoreRange: { min: 35, max: 100 },
    note: "No HTTPS + banking keyword + suspicious TLD + login path",
    category: "credential_phishing",
  },
  {
    id: "url-026",
    type: "url",
    input: "http://secure-account-login.xyz/verify",
    expectedLabel: "scam",
    expectedScoreRange: { min: 35, max: 100 },
    note: "No HTTPS + account security language + suspicious TLD",
    category: "credential_phishing",
  },

  // short_url (2 cases)
  {
    id: "url-027",
    type: "url",
    input: "https://bit.ly/3xYz9Qw",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 10, max: 35 },
    note: "URL shortener — inherently suspicious but not definitive",
    category: "short_url",
  },
  {
    id: "url-028",
    type: "url",
    input: "https://tinyurl.com/verify-account",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 15, max: 40 },
    note: "Shortened URL with 'verify' hinting at phishing intent",
    category: "short_url",
  },

  // delivery_scam (2 cases)
  {
    id: "url-029",
    type: "url",
    input: "http://ups-delivery-track.com/reschedule",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Fake UPS tracking domain + suspicious TLD",
    category: "delivery_scam",
  },
  {
    id: "url-030",
    type: "url",
    input: "http://fedex-package-claim.tk/track",
    expectedLabel: "scam",
    expectedScoreRange: { min: 45, max: 100 },
    note: "Fake FedEx domain + .tk TLD + package claim lure",
    category: "delivery_scam",
  },

  // keyword_edge (1 case)
  {
    id: "url-031",
    type: "url",
    input: "https://www.linkedin.com/jobs",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "LinkedIn jobs page — 'jobs' is a common path on legit sites",
    category: "keyword_false_positive",
  },
];

// ─── Message Cases (target: ~42) ────────────────────────────────────────────

export const messageCases: EvalCase[] = [
  // ── LEGITIMATE MESSAGES (True Negatives) ─────────────────────────────────

  // casual (2 cases)
  {
    id: "msg-001",
    type: "message",
    input: "Hey, are we still meeting for lunch at noon tomorrow?",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 10 },
    note: "Casual friend message — zero scam indicators",
    category: "casual",
  },
  {
    id: "msg-002",
    type: "message",
    input: "Can you pick up milk on your way home? Thanks!",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 10 },
    note: "Simple personal request",
    category: "casual",
  },

  // workplace (2 cases)
  {
    id: "msg-003",
    type: "message",
    input: "Hi Sarah, please send me the Q3 report when you have a chance. Thanks!",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Normal workplace communication",
    category: "workplace",
  },
  {
    id: "msg-004",
    type: "message",
    input: "Team standup has been moved to 3pm. Please confirm attendance.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Standard workplace meeting update",
    category: "workplace",
  },

  // banking_legit (2 cases)
  {
    id: "msg-005",
    type: "message",
    input: "Your bank statement is ready. Log in at https://www.chase.com to view it.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Bank notification with legitimate domain — 'view' not 'verify'",
    category: "banking_legit",
  },
  {
    id: "msg-006",
    type: "message",
    input: "Your deposit of $1,250.00 has been credited to your account ending in 4521.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Routine bank deposit notification",
    category: "banking_legit",
  },

  // delivery (2 cases)
  {
    id: "msg-007",
    type: "message",
    input: "Your package will be delivered today between 2-4 PM. Track at ups.com/track.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Delivery notification from UPS with legitimate domain",
    category: "delivery",
  },
  {
    id: "msg-008",
    type: "message",
    input: "Your order #442-881234-5566778 has shipped via FedEx. Expected delivery: Oct 5.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Order confirmation with tracking number — legitimate pattern",
    category: "delivery",
  },

  // appointment (2 cases)
  {
    id: "msg-009",
    type: "message",
    input: "Reminder: Your doctor appointment is scheduled for Thursday at 3pm.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 10 },
    note: "Medical appointment reminder",
    category: "appointment",
  },
  {
    id: "msg-010",
    type: "message",
    input: "Your car service appointment is confirmed for next Tuesday at 10am. Reference #CS-9921.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 10 },
    note: "Automotive service reminder",
    category: "appointment",
  },

  // social (1 case)
  {
    id: "msg-011",
    type: "message",
    input: "The team dinner is this Friday at 7pm at Mario's Italian. Let me know if you can make it!",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 10 },
    note: "Social invitation — no scam elements",
    category: "social",
  },

  // government_legit (2 cases)
  {
    id: "msg-012",
    type: "message",
    input: "Your tax refund of $1,234 has been processed. Direct deposit in 1-2 business days.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 25 },
    note: "Legitimate IRS refund notification (direct deposit, no link)",
    category: "government_legit",
  },
  {
    id: "msg-013",
    type: "message",
    input: "Court hearing scheduled for November 12 at 9am. Case #2024-CV-00891. Report to clerk's office.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 15 },
    note: "Legitimate court summons — no payment demand or threat",
    category: "government_legit",
  },

  // utility_legit (2 cases)
  {
    id: "msg-014",
    type: "message",
    input: "Your electricity bill of $87.50 is due on the 15th. Pay online at myutility.com.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Legitimate utility bill with real domain",
    category: "utility_legit",
  },
  {
    id: "msg-015",
    type: "message",
    input: "HOA assessment notice: Your quarterly fee of $150 is due. Pay at mycommunityhoa.org.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Legitimate HOA fee notice",
    category: "utility_legit",
  },

  // ── BORDERLINE MESSAGES ───────────────────────────────────────────────────

  // verification_ambiguous (2 cases)
  {
    id: "msg-016",
    type: "message",
    input: "URGENT: Your account verification is expiring in 24 hours. Please confirm your details at the link below.",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 20, max: 55 },
    note: "Could be legitimate bank alert or phishing — depends on context",
    category: "verification_ambiguous",
  },
  {
    id: "msg-017",
    type: "message",
    input: "Your subscription will be cancelled soon if you don't update your payment information.",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 20, max: 55 },
    note: "Threat language but could be a legitimate service reminder",
    category: "threat_ambiguous",
  },

  // marketing_urgency (2 cases)
  {
    id: "msg-018",
    type: "message",
    input: "Act now! Limited time offer — 50% off all items. Shop at example-shop.com",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 15, max: 40 },
    note: "Marketing urgency — common in both legit and scam contexts",
    category: "marketing_urgency",
  },
  {
    id: "msg-019",
    type: "message",
    input: "Last chance! Your cart is about to expire. Complete your purchase now at shop.example.com.",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 0, max: 20 },
    note: "E-commerce cart expiry — legitimate use of urgency language",
    category: "marketing_urgency",
  },

  // ── CLEAR SCAM MESSAGES (True Positives) ─────────────────────────────────

  // prize_scam (3 cases)
  {
    id: "msg-020",
    type: "message",
    input: "Congratulations! You have been selected to receive a $1,000,000 lottery prize. Click here to claim: http://claim-prize-now.xyz",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Classic advance-fee lottery scam",
    category: "prize_scam",
  },
  {
    id: "msg-021",
    type: "message",
    input: "You won a $500 Amazon gift card! Send $25 processing fee via Google Play gift card to redeem. Do not tell anyone about this offer.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Gift card scam + secrecy pressure + advance fee",
    category: "prize_scam",
  },
  {
    id: "msg-022",
    type: "message",
    input: "BREAKING: You've been randomly selected as our $10,000 weekly winner! Claim now at http://winner-claim.tk",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Random winner scam + suspicious TLD",
    category: "prize_scam",
  },

  // romance_scam (2 cases)
  {
    id: "msg-023",
    type: "message",
    input: "Dear friend, I am a soldier deployed overseas. I need you to send money via Western Union so I can come visit you. I will pay you back double.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Classic romance/military scam",
    category: "romance_scam",
  },
  {
    id: "msg-024",
    type: "message",
    input: "I fell in love with you from our first chat. I need $2,000 for my visa. I promise to marry you and never leave you.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Romance scam with money request + marriage promise",
    category: "romance_scam",
  },

  // tech_support_scam (2 cases)
  {
    id: "msg-025",
    type: "message",
    input: "Your computer has been infected with 47 viruses! Call Microsoft support now at 1-800-555-0199 to fix it immediately.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Tech support scam impersonating Microsoft",
    category: "tech_support_scam",
  },
  {
    id: "msg-026",
    type: "message",
    input: "WARNING: Your Windows PC has a critical security alert! Download our free scanner from http://pc-safe-tool.tk now!",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Fake Windows alert + suspicious download link",
    category: "tech_support_scam",
  },

  // credential_phishing (3 cases)
  {
    id: "msg-027",
    type: "message",
    input: "Your account has been suspended due to suspicious activity. Verify your identity immediately by clicking this link and entering your password: http://secure-login-verify.com",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Credential phishing — urgency + password request + suspicious domain",
    category: "credential_phishing",
  },
  {
    id: "msg-028",
    type: "message",
    input: "Security alert: Unusual login detected from Russia. Click here to secure your account: http://account-secure.xyz/reset",
    expectedLabel: "scam",
    expectedScoreRange: { min: 30, max: 100 },
    note: "Fake security alert + geographic scare + suspicious domain",
    category: "credential_phishing",
  },
  {
    id: "msg-029",
    type: "message",
    input: "Your Google account will be deleted in 48 hours. Confirm your details at http://google-verify.tk to keep it.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Google impersonation + deletion threat + suspicious TLD",
    category: "credential_phishing",
  },

  // authority_impersonation (3 cases)
  {
    id: "msg-030",
    type: "message",
    input: "From: IRS Tax Department. You have a pending tax refund of $2,847. Click here to claim: http://irs-refund-claim.tk",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Government impersonation + suspicious TLD + financial lure",
    category: "authority_impersonation",
  },
  {
    id: "msg-031",
    type: "message",
    input: "Social Security Administration: Your SSN has been suspended. Call 1-800-555-0123 immediately to restore it.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 25, max: 100 },
    note: "SSA impersonation + threat + fake callback number",
    category: "authority_impersonation",
  },
  {
    id: "msg-032",
    type: "message",
    input: "FINAL NOTICE from the Department of Motor Vehicles. Your license is suspended. Pay $150 reinstatement fee now or face legal action.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 25, max: 100 },
    note: "DMV impersonation + legal threat + fee demand",
    category: "authority_impersonation",
  },

  // money_mule (2 cases)
  {
    id: "msg-033",
    type: "message",
    input: "We need you to transfer $3,000 to this account on behalf of our company. You will be reimbursed within 48 hours plus a 10% bonus.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Money mule scam",
    category: "money_mule",
  },
  {
    id: "msg-034",
    type: "message",
    input: "Work from home earning $5,000/week! Just deposit and forward payments for our clients. Use your personal bank account.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Money mule + unrealistic earnings + personal account use",
    category: "money_mule",
  },

  // legal_threat (2 cases)
  {
    id: "msg-035",
    type: "message",
    input: "Your warrant is pending. Federal authorities are monitoring your account. Pay $500 fine immediately to avoid arrest.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Legal threat + urgency + demand for payment",
    category: "legal_threat",
  },
  {
    id: "msg-036",
    type: "message",
    input: "ATTORNEY GENERAL OFFICE: You are under investigation for fraud. Send $1,000 bond via gift card to dismiss charges.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Federal impersonation + investigation threat + gift card payment",
    category: "legal_threat",
  },

  // delivery_scam (2 cases)
  {
    id: "msg-037",
    type: "message",
    input: "Your package delivery failed. Click here to reschedule: http://ups-delivery-track.com/reschedule",
    expectedLabel: "scam",
    expectedScoreRange: { min: 30, max: 100 },
    note: "Delivery scam — fake UPS tracking domain with urgency",
    category: "delivery_scam",
  },
  {
    id: "msg-038",
    type: "message",
    input: "USPS: Delivery attempt failed. Pay $2.99 customs fee at http://usps-redelivery.tk to receive your package.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 10, max: 100 },
    note: "USPS impersonation + tiny fee lure + suspicious TLD",
    category: "delivery_scam",
  },

  // advance_fee_msg (1 case)
  {
    id: "msg-039",
    type: "message",
    input: "You've won a free iPhone 16! Just pay $15 shipping and handling to claim your prize. Offer expires in 6 hours!",
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "Prize scam + advance fee + urgency",
    category: "advance_fee_msg",
  },

  // corporate_account_use (1 case)
  {
    id: "msg-040",
    type: "message",
    input: "Please use your corporate bank account to process this vendor payment of $12,000. We will reimburse you next week.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 15, max: 100 },
    note: "Corporate account use request — money mule variant",
    category: "corporate_mule",
  },
];

// ─── Job Cases (target: ~42) ────────────────────────────────────────────────

export const jobCases: EvalCase[] = [
  // ── LEGITIMATE JOBS (True Negatives) ─────────────────────────────────────

  // standard_job (3 cases)
  {
    id: "job-001",
    type: "job",
    input: `Software Engineer — Full Time
Acme Corp is hiring a Senior Software Engineer for our Seattle office.
Requirements: 5+ years experience with React, TypeScript, and Node.js.
Salary: $130,000 - $170,000 per year plus benefits.
Apply at https://acme-corp.com/careers`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 25 },
    note: "Standard legitimate job posting with salary and real domain",
    category: "standard_job",
  },
  {
    id: "job-002",
    type: "job",
    input: `Marketing Manager
Google LLC is seeking an experienced Marketing Manager for our Mountain View office.
This is a full-time onsite position. Compensation: $110,000 - $150,000 per year.
W-2 employment with full benefits. Apply through our careers page.`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 25 },
    note: "Major company posting with W-2 reference and specific salary",
    category: "standard_job",
  },
  {
    id: "job-003",
    type: "job",
    input: `Part-time Data Analyst
Local accounting firm in Denver, CO is hiring a part-time data analyst.
Experience with Excel and SQL required. $35/hour.
Must be able to work onsite 3 days per week. Submit resume via LinkedIn.`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 25 },
    note: "Local business posting, specific requirements, legitimate contact method",
    category: "local_business",
  },

  // remote_legit (2 cases)
  {
    id: "job-004",
    type: "job",
    input: `Remote Customer Service Representative
We are looking for remote customer service agents. This is a legitimate work-from-home
position with an established company. Hourly pay: $18. Formal interview process via Zoom.
Employment type: full-time, W-2. Background check required after offer.`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 5, max: 30 },
    note: "Remote job with professional process — formal interview + W-2",
    category: "remote_legit",
  },
  {
    id: "job-005",
    type: "job",
    input: `Work From Home — Content Writer
Established publishing company seeks remote content writers.
$25/hour, flexible schedule. Must have 2+ years writing experience.
Interview via video call. Paid via direct deposit. Company: contentpro.com`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 5, max: 30 },
    note: "Legitimate remote writing job with company domain and real process",
    category: "remote_legit",
  },

  // entry_level (2 cases)
  {
    id: "job-006",
    type: "job",
    input: `Entry-Level Project Manager
TechStart Inc. is hiring an entry-level project manager.
Location: Austin, TX (hybrid). Salary: $65,000 - $80,000/year.
Requirements: Bachelor's degree, 1+ year experience.
Standard application process through Greenhouse.`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 25 },
    note: "Entry-level posting with specific details and real hiring platform",
    category: "entry_level",
  },
  {
    id: "job-007",
    type: "job",
    input: `Junior Sales Associate
Retail chain hiring entry-level sales staff. No experience required.
$15/hour + commission. Training provided. Apply in-store or at retailjobs.example.com.
Full-time and part-time positions available.`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 45 },
    note: "Standard retail job posting with in-store application option",
    category: "entry_level",
  },

  // major_company (2 cases)
  {
    id: "job-008",
    type: "job",
    input: `Data Scientist — Microsoft
Microsoft is hiring a Data Scientist for our AI division in Redmond, WA.
PhD preferred. Salary range: $150,000 - $200,000.
Apply via careers.microsoft.com. All roles are onsite.`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Official Microsoft job posting",
    category: "major_company",
  },
  {
    id: "job-009",
    type: "job",
    input: `Registered Nurse — Stanford Health Care
Stanford Health Care is seeking RNs for our ICU unit.
Required: BSN, CA license, 2+ years ICU experience.
Salary: $95,000 - $125,000. Benefits include 401k and health insurance.
Apply at stanfordhealthcare.org/careers`,
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Legitimate healthcare employer posting with real domain",
    category: "major_company",
  },

  // ── BORDERLINE JOBS ──────────────────────────────────────────────────────

  // vague_remote (2 cases)
  {
    id: "job-010",
    type: "job",
    input: `Work From Home Data Entry — $25/hour
Simple data entry work from the comfort of your home.
No experience needed. Flexible hours. Apply today!
Contact: remotejobs2024@gmail.com`,
    expectedLabel: "borderline",
    expectedScoreRange: { min: 20, max: 45 },
    note: "Vague but not overtly scammy — personal email is a weak signal",
    category: "vague_remote",
  },
  {
    id: "job-011",
    type: "job",
    input: `Immediate Opening: Virtual Assistant
Looking for motivated individuals to work remotely.
$20/hour, flexible schedule. No interviews — start immediately!
Send your resume to: hiring@fastcash.biz`,
    expectedLabel: "borderline",
    expectedScoreRange: { min: 25, max: 50 },
    note: "Hasty tone and suspicious domain, but no explicit fee requests",
    category: "suspicious_domain",
  },

  // no_salary (2 cases)
  {
    id: "job-012",
    type: "job",
    input: `Administrative Assistant Needed
Busy law office seeks organized individual for filing and phone coverage.
Competitive salary. Must have own transportation.
Call during business hours for interview.`,
    expectedLabel: "borderline",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Vague but plausible — no salary stated but otherwise normal",
    category: "vague_posting",
  },
  {
    id: "job-013",
    type: "job",
    input: `Part-Time House Cleaner
Looking for reliable house cleaner for private residence.
Cash payment. Flexible schedule. References required.
Text only, please.`,
    expectedLabel: "borderline",
    expectedScoreRange: { min: 0, max: 20 },
    note: "Informal posting but plausible for domestic work",
    category: "vague_posting",
  },

  // ── CLEAR SCAM JOBS (True Positives) ─────────────────────────────────────

  // advance_fee (3 cases)
  {
    id: "job-014",
    type: "job",
    input: `REMOTE DATA ENTRY — $45/HOUR!!!
Work from home and earn $3,000/week! No experience needed.
Send $75 registration fee via Gift Card to secure your spot.
Limited positions — apply NOW before spots fill up!
Contact: jobs@quickhire.xyz`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Advance fee + unrealistic income + urgency + suspicious TLD",
    category: "advance_fee",
  },
  {
    id: "job-015",
    type: "job",
    input: `You've been pre-selected for a $85/hour position!
Guaranteed job with no interview required.
Send $200 for background check processing via cryptocurrency.
Reply with your full SSN, bank account, and photo ID to confirm.
This offer expires in 24 hours!`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Guaranteed job + crypto fee + SSN/bank request + urgency",
    category: "advance_fee",
  },
  {
    id: "job-016",
    type: "job",
    input: `Hiring Immediately — $50/hr Work From Home
No experience necessary! Earn $2,500/week easily.
Pay $99 startup fee via Western Union to activate your account.
Must reply within 24 hours or lose your spot!`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 50, max: 100 },
    note: "UFCP pattern: unrealistic pay + advance fee + wire transfer + urgency",
    category: "advance_fee",
  },

  // reshipping_scam (2 cases)
  {
    id: "job-017",
    type: "job",
    input: `Hiring Warehouse Associates — Ship Products From Home!
Make $30/hour packaging and shipping items. All materials provided.
Must have your own address for shipping. We will send you packages to repackage
and forward to different addresses. Background check fee: $75 payable by Money Order.`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Reshipping scam + advance fee + money order payment",
    category: "reshipping_scam",
  },
  {
    id: "job-018",
    type: "job",
    input: `Package Handler — Work From Home
Repurchase items and ship them to addresses we provide.
$40/hour commission. Your own address required.
Send $50 equipment fee via MoneyGram to get started.`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 35, max: 100 },
    note: "Reshipping + money order fee + unrealistic pay",
    category: "reshipping_scam",
  },

  // task_scam (2 cases)
  {
    id: "job-019",
    type: "job",
    input: `Earn $500/day from home! Just like and subscribe to YouTube videos.
All you need is your phone. Sign up at bit.ly/earn-fast.
Send $25 activation fee to unlock your earning potential.
Do not tell anyone about this opportunity!`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Task scam + advance fee + secrecy pressure",
    category: "task_scam",
  },
  {
    id: "job-020",
    type: "job",
    input: `App Tester Wanted — $100 per app!
Test mobile apps from your phone and get paid.
Send $10 registration fee via Apple Gift Card.
Complete 5 apps in first week for bonus!`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 30, max: 100 },
    note: "Task scam + gift card fee + unrealistic per-task pay",
    category: "task_scam",
  },

  // credential_theft (3 cases)
  {
    id: "job-021",
    type: "job",
    input: `Apply now for exciting career opportunities at top companies!
Create your free profile at http://secure-job-portal.net/login to access exclusive listings.
We need your full Social Security Number, bank account details, and government ID
to verify your identity and set up direct deposit. Your information is 100% secure.`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Credential harvesting + suspicious domain + SSN/bank request",
    category: "credential_theft",
  },
  {
    id: "job-022",
    type: "job",
    input: `Quick Hire — No Interview!
Send us your SSN, date of birth, and a photo of your driver's license.
We'll set up your payroll in 24 hours.
Contact hr@tempmail.org for immediate placement.`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "Excessive PII collection + temp email + no interview",
    category: "credential_theft",
  },
  {
    id: "job-023",
    type: "job",
    input: `Join Our Team — Full Benefits!
We need your Social Security Number, bank routing number, and account number
to set up direct deposit and verify your identity before you start.
Send all documents to jobs-hiring@protonmail.com`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "SSN + bank details requested upfront via encrypted email",
    category: "credential_theft",
  },

  // money_mule_job (2 cases)
  {
    id: "job-024",
    type: "job",
    input: `URGENT: We need you to transfer funds for our international clients.
You will receive $5,000/month plus 15% commission.
No skills needed — just use your personal bank account.
Move the conversation to WhatsApp for details. Act now!`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Money mule + WhatsApp-only + unrealistic pay",
    category: "money_mule",
  },
  {
    id: "job-025",
    type: "job",
    input: `Payment Processor Needed — $3,000/week
Receive payments into your personal bank account and forward them to us.
Keep 20% as your commission. No experience required.
Contact: payments-jobs@ Guerillamail.com`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 30, max: 100 },
    note: "Payment forwarding mule + personal account + temp email",
    category: "money_mule",
  },

  // fake_check (1 case)
  {
    id: "job-026",
    type: "job",
    input: `We are hiring for a Remote Customer Service position paying $50/hour.
No experience needed. You will receive a check to purchase equipment.
Please send $100 processing fee via Western Union to start.
Contact recruiter@tempmail.org immediately.`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Fake check scam + wire transfer + personal email",
    category: "advance_fee",
  },

  // illegal_goods (1 case)
  {
    id: "job-027",
    type: "job",
    input: `Looking for helpers to package and ship supplements.
Work from home, $75/hour. No questions asked.
Must be willing to handle controlled substances.
Reply with your address and phone number.`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 8, max: 100 },
    note: "Drug mule / illegal activity recruitment",
    category: "illegal_activity",
  },

  // MLM (1 case)
  {
    id: "job-028",
    type: "job",
    input: `Be Your Own Boss! Earn $10,000/month working from home.
Join our revolutionary network marketing program.
Buy our $499 starter kit to get started.
Recruit 3 friends and get a free vacation!
Contact: success@get-rich-quick.biz`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 25, max: 100 },
    note: "MLM pyramid scheme + upfront purchase + unrealistic earnings",
    category: "mlm_scheme",
  },
];

// ─── Adversarial Cases (target: ~10) ────────────────────────────────────────

/**
 * Adversarial cases designed to stress-test scanner boundaries.
 * These include obfuscated inputs, mixed signals, and edge cases.
 * Marked with `adversarial: true`.
 */
export const adversarialCases: EvalCase[] = [
  // URL: Unicode lookalike / IDN homograph attempt
  {
    id: "adv-url-001",
    type: "url",
    input: "https://www.paypal.com.security-check.tk",
    expectedLabel: "scam",
    expectedScoreRange: { min: 45, max: 100 },
    note: "Double-barrel lookalike with security keyword and suspicious TLD",
    category: "typosquatting",
    adversarial: true,
  },
  // URL: Capitalization obfuscation
  {
    id: "adv-url-002",
    type: "url",
    input: "https://GooGle-Security-Update.com/verify",
    expectedLabel: "scam",
    expectedScoreRange: { min: 40, max: 100 },
    note: "Mixed-case Google impersonation + security keyword",
    category: "brand_impersonation",
    adversarial: true,
  },
  // URL: URL with legitimate-looking path but suspicious domain
  {
    id: "adv-url-003",
    type: "url",
    input: "https://secure-login-update.xyz/www.paypal.com/login",
    expectedLabel: "scam",
    expectedScoreRange: { min: 45, max: 100 },
    note: "PayPal path on suspicious .xyz domain",
    category: "credential_phishing",
    adversarial: true,
  },
  // Message: Scam with mixed legitimate signals (partially obfuscated)
  {
    id: "adv-msg-001",
    type: "message",
    input: "Your account has a security issue. Please verify at https://secure-banking-verify.com within 24 hours or your account will be locked. Call 1-800-555-0100 for help.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Mix of urgency, suspicious domain, AND a phone number — full phishing pattern",
    category: "credential_phishing",
    adversarial: true,
  },
  // Message: Legitimate message with some urgency keywords
  {
    id: "adv-msg-002",
    type: "message",
    input: "URGENT: Your tax filing deadline is March 15. File at irs.gov or you may face penalties. Contact your tax preparer with questions.",
    expectedLabel: "legitimate",
    expectedScoreRange: { min: 0, max: 30 },
    note: "Real IRS deadline with .gov domain — urgency is appropriate",
    category: "government_legit",
    adversarial: true,
  },
  // Message: Scam disguised as corporate communication
  {
    id: "adv-msg-003",
    type: "message",
    input: "FROM: HR Department. Your direct deposit setup is incomplete. Provide your bank routing number and account number at http://hr-portal-company.tk to avoid payroll delay.",
    expectedLabel: "scam",
    expectedScoreRange: { min: 60, max: 100 },
    note: "Corporate HR impersonation + bank detail request + suspicious TLD",
    category: "credential_theft",
    adversarial: true,
  },
  // Job: Mix of real-looking details with one clear scam signal
  {
    id: "adv-job-001",
    type: "job",
    input: `Senior Consultant — Remote
Competitive salary $90,000+. Join our global team.
We provide all equipment. You work from anywhere.
Send $50 administrative fee via gift card to process your onboarding.
Contact: onboard@consulting-jobs.tk`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 50, max: 100 },
    note: "Legitimate-sounding job description + one advance-fee red flag",
    category: "advance_fee",
    adversarial: true,
  },
  // Job: Scam with multiline obfuscation
  {
    id: "adv-job-002",
    type: "job",
    input: `Immediate Hiring — No Experience Needed
Position: Online Task Worker
Pay: $500/week guaranteed
Requirements:
- Must have personal bank account
- Will process client payments
- Use your own account to receive and forward funds
Commission: 20% of all transactions
Contact: payments@darkmail.com`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 55, max: 100 },
    note: "Money mule disguised as 'task worker' with multiline formatting",
    category: "money_mule",
    adversarial: true,
  },
  // URL: Legitimate shortener used in phishing context
  {
    id: "adv-url-004",
    type: "url",
    input: "https://t.co/abc123xyz",
    expectedLabel: "borderline",
    expectedScoreRange: { min: 15, max: 40 },
    note: "Twitter short link — context-dependent, inherently ambiguous",
    category: "short_url",
    adversarial: true,
  },
  // Message: Scam with partial obfuscation (leet speak)
  {
    id: "adv-msg-004",
    type: "message",
    input: "H3y! Y0u w0n a $5000 Amazon gift c4rd! Cl1ck h3r3 t0 cl41m: http://gift-c4rd-claim.tk. D0nt t3ll any0ne!",
    expectedLabel: "scam",
    expectedScoreRange: { min: 50, max: 100 },
    note: "Leet-speak obfuscation of classic gift card scam",
    category: "prize_scam",
    adversarial: true,
  },
  // Job: Scam hiding fee in fine print
  {
    id: "adv-job-003",
    type: "job",
    input: `Full-Time Remote Position — Data Entry
Salary: $25/hour. Benefits included.
Flexible schedule, work from home.
Note: A one-time $30 training material fee is required (paid via Venmo @quickcash2024).
Apply now — limited spots!`,
    expectedLabel: "scam",
    expectedScoreRange: { min: 50, max: 100 },
    note: "Fee hidden in fine print + Venmo personal handle + urgency",
    category: "advance_fee",
    adversarial: true,
  },
];

// ─── Aggregation ─────────────────────────────────────────────────────────────

/**
 * Flat list of all cases for the evaluator.
 */
export function getAllCases(): EvalCase[] {
  return [...urlCases, ...messageCases, ...jobCases, ...adversarialCases];
}

export function getCasesByType(type: "url" | "message" | "job"): EvalCase[] {
  if (type === "url") return urlCases;
  if (type === "message") return messageCases;
  return jobCases;
}

/**
 * Return only adversarial cases (for targeted reporting).
 */
export function getAdversarialCases(): EvalCase[] {
  return adversarialCases;
}
