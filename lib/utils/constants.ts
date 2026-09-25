// Risk level thresholds
export const RISK_LEVELS = {
  MINIMAL: { min: 0, max: 19, label: "Minimal Risk", color: "green" },
  LOW: { min: 20, max: 39, label: "Low Risk", color: "green" },
  MODERATE: { min: 40, max: 59, label: "Moderate Risk", color: "yellow" },
  HIGH: { min: 60, max: 79, label: "High Risk", color: "orange" },
  CRITICAL: { min: 80, max: 100, label: "Critical Risk", color: "red" },
} as const;

// Scan types
export const SCAN_TYPES = {
  URL: "url",
  MESSAGE: "message",
  JOB: "job",
} as const;

// Indicator severity
export const SEVERITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  POSITIVE: "positive",
} as const;

// Suspicious TLDs commonly used in phishing
export const SUSPICIOUS_TLDS = [
  "xyz", "top", "club", "online", "site", "live", "work",
  "click", "link", "info", "biz", "name", "pro", "tk",
  "ml", "ga", "cf", "gq", "pw", "cc", "ru", "cn", "today",
];

// Well-known trusted TLDs
export const TRUSTED_TLDS = [
  "gov", "edu", "mil", "int",
];

// Common brand names often impersonated
export const IMPERSONATED_BRANDS = [
  "google", "microsoft", "apple", "amazon", "facebook", "meta",
  "paypal", "ebay", "netflix", "spotify", "linkedin", "twitter",
  "instagram", "whatsapp", "chase", "bofa", "wellsfargo", "citi",
  "irs", "ssn", "medicare", "usps", "ups", "fedex", "dhl",
];

// Suspicious URL keywords
export const SUSPICIOUS_KEYWORDS = [
  "verify", "confirm", "secure", "login", "signin", "account",
  "update", "suspend", "locked", "verifynow", "updateinfo",
  "security", "alert", "warning", "limited", "access", "unusual",
  "password", "credential", "banking", "wire", "transfer",
];

// Rate limits
export const RATE_LIMITS = {
  ANONYMOUS: { scansPerHour: 3 },
  FREE: { scansPerMonth: 10 },
  PRO: { scansPerMonth: 100 },
  BUSINESS: { scansPerMonth: 1000 },
} as const;

// Subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  PRO: "pro",
  BUSINESS: "business",
} as const;

// Scan retention period in days
export const SCAN_RETENTION_DAYS = 30;

// Max input lengths
export const MAX_INPUT_LENGTHS = {
  URL: 2048,
  MESSAGE: 10000,
  JOB: 10000,
} as const;
