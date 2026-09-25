import { RiskIndicator, Severity } from "@/types/scan";
import { SUSPICIOUS_TLDS, TRUSTED_TLDS, RISK_LEVELS } from "@/lib/utils/constants";

export interface ScoringSignal {
  id: string;
  score: number;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  evidence?: string;
}

export interface ScoringResult {
  score: number;
  riskLevel: keyof typeof RISK_LEVELS;
  indicators: RiskIndicator[];
}

/**
 * Calculate risk level from score
 */
export function getRiskLevel(score: number): keyof typeof RISK_LEVELS {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  if (score >= 20) return "LOW";
  return "MINIMAL";
}

/**
 * Aggregate signals into final score and indicators
 */
export function aggregateSignals(signals: ScoringSignal[]): ScoringResult {
  // When strong negative signals exist (lookalike, brand impersonation, shortener, etc.),
  // neutralize positive signals so HTTPS/SSL on a suspicious site doesn't reduce the score.
  const hasStrongNegative = signals.some(
    (s) => s.severity === "critical" || (s.severity === "high" && s.score > 0)
  );
  let totalScore = signals.reduce((sum, signal) => {
    if (hasStrongNegative && signal.severity === "positive") return sum;
    return sum + signal.score;
  }, 0);
  totalScore = Math.max(0, Math.min(100, totalScore));

  const indicators: RiskIndicator[] = signals
    .filter((s) => s.score !== 0)
    .sort((a, b) => {
      const severityOrder: Record<Severity, number> = {
        critical: 0, high: 1, medium: 2, low: 3, positive: 4,
      };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })
    .map((s) => ({
      severity: s.severity,
      category: s.category,
      title: s.title,
      description: s.description,
      evidence: s.evidence,
    }));

  return { score: totalScore, riskLevel: getRiskLevel(totalScore), indicators };
}

/**
 * Score URL-based signals
 */
export function scoreUrlSignals(url: string, domain: string | null): ScoringSignal[] {
  const signals: ScoringSignal[] = [];
  if (!domain) return signals;

  const tld = domain.split(".").pop()?.toLowerCase() || "";

  // Suspicious TLD
  if (SUSPICIOUS_TLDS.includes(tld)) {
    signals.push({
      id: "suspicious_tld", score: 12, severity: "high", category: "domain",
      title: "Suspicious top-level domain",
      description: `The .${tld} top-level domain is commonly used in phishing and fraudulent websites.`,
      evidence: `Domain uses .${tld} TLD`,
    });
  }

  // Trusted TLD
  if (TRUSTED_TLDS.includes(tld)) {
    signals.push({
      id: "trusted_tld", score: -5, severity: "positive", category: "domain",
      title: "Trusted domain extension",
      description: `The .${tld} extension is restricted and typically indicates a legitimate organization.`,
    });
  }

  // Lookalike detection — match known typosquat aliases, never flag legitimate brand domains
  const lookalikeData = [
    { brand: "Google", domain: "google", aliases: ["g00gle", "g0ogle", "googel", "gooogle", "gogole"] },
    { brand: "Microsoft", domain: "microsoft", aliases: ["microsft", "microsof"] },
    { brand: "PayPal", domain: "paypal", aliases: ["paypa1", "paypol"] },
    { brand: "Amazon", domain: "amazon", aliases: ["amaz0n"] },
    { brand: "Facebook", domain: "facebook", aliases: ["faceb00k", "faceb0k"] },
    { brand: "Netflix", domain: "netflix", aliases: ["netfl1x", "netfl0x"] },
  ];

  const domainLower = domain.toLowerCase();
  for (const { brand, domain: brandDomain, aliases } of lookalikeData) {
    // Never flag the exact legitimate brand or its .com subdomains
    if (domainLower === brandDomain || domainLower === `${brandDomain}.com` || domainLower.endsWith(`.${brandDomain}.com`)) continue;
    const aliasMatch = aliases.some((a) => domainLower.includes(a.toLowerCase()));
    if (aliasMatch) {
      signals.push({
        id: "lookalike_domain", score: 36, severity: "critical", category: "domain",
        title: "Potential brand impersonation",
        description: `This domain appears to be impersonating ${brand}.`,
        evidence: `Domain "${domain}" matches lookalike pattern for ${brand}`,
      });
      break;
    }
  }

  // Compound brand-impersonation: brand name + security/verify/login keywords on non-official domain
  const brandImpersonationData = [
    { brand: "Google", brandDomain: "google" },
    { brand: "Microsoft", brandDomain: "microsoft" },
    { brand: "PayPal", brandDomain: "paypal" },
    { brand: "Amazon", brandDomain: "amazon" },
    { brand: "Facebook", brandDomain: "facebook" },
    { brand: "Netflix", brandDomain: "netflix" },
    { brand: "Apple", brandDomain: "apple" },
    { brand: "Chase", brandDomain: "chase" },
    { brand: "Wells Fargo", brandDomain: "wellsfargo" },
    { brand: "IRS", brandDomain: "irs" },
    { brand: "UPS", brandDomain: "ups" },
    { brand: "FedEx", brandDomain: "fedex" },
    { brand: "USPS", brandDomain: "usps" },
  ];
  const securityKeywords = ["verify", "confirm", "secure", "login", "signin", "account", "update", "suspended", "suspension", "activity", "security", "alert", "warning", "claim", "refund", "celebration", "deals", "reschedule", "redelivery"];
  for (const { brand, brandDomain } of brandImpersonationData) {
    if (domainLower === brandDomain || domainLower === `${brandDomain}.com` || domainLower.endsWith(`.${brandDomain}.com`)) continue;
    const brandInDomain = domainLower.includes(brandDomain.toLowerCase());
    if (!brandInDomain) continue;
    const urlLower = url.toLowerCase();
    const hasSecurityKeyword = securityKeywords.some((kw) => urlLower.includes(kw));
    if (hasSecurityKeyword) {
      signals.push({
        id: "brand_impersonation_compound", score: 20, severity: "high", category: "domain",
        title: "Brand impersonation attempt",
        description: `This domain uses "${brand}" branding in a non-official context with security-related language.`,
        evidence: `Domain "${domain}" contains "${brandDomain}" with security keyword`,
      });
      break;
    }
  }

  // Suspicious keywords — only flag if domain is not a well-known legitimate brand
  const suspiciousKeywords = ["verify", "confirm", "secure", "login", "signin", "account", "update", "suspend", "locked"];
  const urlLower = url.toLowerCase();
  const isKnownBrand = ["google", "microsoft", "paypal", "amazon", "facebook", "netflix", "apple", "chase", "wellsfargo", "citi", "irs", "usps", "fedex", "ups", "linkedin", "twitter", "instagram", "whatsapp"].some(
    (b) => domainLower === b || domainLower === `${b}.com` || domainLower.endsWith(`.${b}.com`)
  );
  if (!isKnownBrand) {
    for (const keyword of suspiciousKeywords) {
      if (urlLower.includes(keyword)) {
        signals.push({
          id: "suspicious_keyword", score: 6, severity: "medium", category: "content",
          title: "Suspicious keyword in URL",
          description: `The URL contains "${keyword}", commonly used in phishing URLs.`,
        });
        break;
      }
    }
  }

  // URL shortener detection — word boundaries prevent false positives like "support.com" matching "t.co"
  const shortenerPatterns = [
    /\bbit\.ly\b/i, /\btinyurl\.com\b/i, /\bt\.co\b/i, /\bgoo\.gl\b/i, /\bow\.ly\b/i,
    /\btiny\.cc\b/i, /\bis\.gd\b/i, /\bshort\.link\b/i, /\bcut\.url\b/i, /\bshrtd\.nl\b/i,
  ];
  const isShortener = shortenerPatterns.some((p) => p.test(url));
  if (isShortener) {
    signals.push({
      id: "url_shortener", score: 15, severity: "high", category: "technical",
      title: "URL shortener detected",
      description: "This URL uses a link-shortening service that hides the final destination. Shortened links are commonly used in phishing and spam messages.",
    });
  }

  // Long URL
  if (url.length > 150) {
    signals.push({
      id: "long_url", score: 4, severity: "low", category: "technical",
      title: "Unusually long URL",
      description: "Very long URLs can be used to hide malicious parameters.",
    });
  }

  return signals;
}

/**
 * Score HTTPS/SSL signals
 */
export function scoreHttpsSignals(isHttps: boolean, hasValidSsl: boolean | null): ScoringSignal[] {
  const signals: ScoringSignal[] = [];

  if (!isHttps) {
    signals.push({
      id: "no_https", score: 15, severity: "high", category: "technical",
      title: "No HTTPS encryption",
      description: "This website does not use HTTPS. Any information you enter could be intercepted.",
    });
  } else {
    signals.push({
      id: "https_enabled", score: -3, severity: "positive", category: "technical",
      title: "HTTPS enabled",
      description: "The website uses HTTPS encryption.",
    });
  }

  if (isHttps && hasValidSsl === false) {
    signals.push({
      id: "invalid_ssl", score: 20, severity: "critical", category: "technical",
      title: "Invalid SSL certificate",
      description: "The SSL certificate is invalid or expired.",
    });
  }

  if (isHttps && hasValidSsl === true) {
    signals.push({
      id: "valid_ssl", score: -5, severity: "positive", category: "technical",
      title: "Valid SSL certificate",
      description: "The website has a valid SSL certificate.",
    });
  }

  return signals;
}

/**
 * Score content-based signals
 */
export function scoreContentSignals(hasLoginForm: boolean, hasPaymentForm: boolean, isHttps: boolean): ScoringSignal[] {
  const signals: ScoringSignal[] = [];

  if (hasLoginForm && !isHttps) {
    signals.push({
      id: "insecure_login", score: 18, severity: "high", category: "content",
      title: "Insecure login form",
      description: "The page contains a login form but does not use HTTPS.",
    });
  }

  if (hasPaymentForm && !isHttps) {
    signals.push({
      id: "insecure_payment", score: 22, severity: "critical", category: "content",
      title: "Insecure payment form",
      description: "The page requests payment information without HTTPS encryption.",
    });
  }

  return signals;
}

/**
 * Score technical signals
 */
export function scoreTechnicalSignals(httpStatus: number | null, redirectCount: number): ScoringSignal[] {
  const signals: ScoringSignal[] = [];

  if (httpStatus === null) {
    signals.push({
      id: "no_response", score: 8, severity: "medium", category: "technical",
      title: "Website unreachable",
      description: "The website could not be reached.",
    });
  }

  if (redirectCount > 5) {
    signals.push({
      id: "excessive_redirects", score: 10, severity: "high", category: "technical",
      title: "Excessive redirects",
      description: "The URL redirects many times. This can hide the true destination.",
      evidence: `${redirectCount} redirects detected`,
    });
  }

  return signals;
}

/**
 * Score domain age signals
 */
export function scoreDomainAgeSignals(domainAgeDays: number | null): ScoringSignal[] {
  const signals: ScoringSignal[] = [];
  if (domainAgeDays === null) return signals;

  if (domainAgeDays < 7) {
    signals.push({
      id: "very_new_domain", score: 18, severity: "high", category: "domain",
      title: "Very recently registered domain",
      description: `This domain was registered only ${domainAgeDays} days ago.`,
    });
  } else if (domainAgeDays < 30) {
    signals.push({
      id: "new_domain", score: 12, severity: "high", category: "domain",
      title: "Recently registered domain",
      description: `This domain was registered ${domainAgeDays} days ago.`,
    });
  } else if (domainAgeDays > 365 * 2) {
    signals.push({
      id: "established_domain", score: -3, severity: "positive", category: "domain",
      title: "Established domain",
      description: "This domain has been registered for over 2 years.",
    });
  }

  return signals;
}
