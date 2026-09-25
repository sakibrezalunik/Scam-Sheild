import { validateUrlForFetch, normalizeUrl } from "@/services/security/ssrf-guard";
import {
  scoreUrlSignals,
  scoreHttpsSignals,
  scoreContentSignals,
  scoreTechnicalSignals,
  scoreDomainAgeSignals,
  aggregateSignals,
} from "@/services/scoring/risk-engine";
import { UrlAnalysisResult, ScanResult, RiskIndicator } from "@/types/scan";
import { createInputPreview, hashInput } from "@/services/security/input-validator";
import { analyzeWithAi } from "@/services/ai/ai-analyzer";

export interface UrlScanOptions {
  userId?: string;
}

/**
 * Analyze a URL for potential scam/phishing indicators
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function analyzeUrl(inputUrl: string, _options: UrlScanOptions = {}): Promise<ScanResult> {
  const url = normalizeUrl(inputUrl);
  const inputPreview = createInputPreview(url);
  const inputHash = await hashInput(url);

  // Parse URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return createErrorResult("Invalid URL format", inputPreview, inputHash);
  }

  const domain = parsed.hostname;

  // Validate for SSRF
  const validation = await validateUrlForFetch(url);
  if (!validation.valid) {
    return createPartialResult(url, domain, inputPreview, inputHash, validation.error);
  }

  // Collect analysis data
  const analysisData = await collectUrlAnalysisData(url, parsed);

  // Score signals
  const allSignals = [
    ...scoreUrlSignals(url, domain),
    ...scoreHttpsSignals(analysisData.isHttps, analysisData.hasValidSsl),
    ...scoreContentSignals(analysisData.hasLoginForm, analysisData.hasPaymentForm, analysisData.isHttps),
    ...scoreTechnicalSignals(analysisData.httpStatus, analysisData.redirectCount),
    ...scoreDomainAgeSignals(analysisData.domainAgeDays),
  ];

  const { score, riskLevel, indicators } = aggregateSignals(allSignals);

  // Generate summary and recommendations
  const summary = generateSummary(score, riskLevel, domain);
  const recommendations = generateRecommendations(score, riskLevel, indicators);

  // Build result (AI integration is async — fire-and-forget via runAiAnalysis)
  const result: ScanResult = {
    id: crypto.randomUUID(),
    scanType: "url",
    inputPreview,
    inputHash,
    riskScore: score,
    riskLevel: riskLevel.toLowerCase() as ScanResult["riskLevel"],
    category: categorizeRisk(riskLevel, indicators),
    summary,
    indicators,
    recommendations,
    urlAnalysis: analysisData,
    createdAt: new Date(),
  };

  // Fire AI analysis asynchronously (non-blocking)
  void runAiAnalysis(result);

  return result;
}

/**
 * Collect technical data about the URL
 */
async function collectUrlAnalysisData(url: string, parsed: URL): Promise<UrlAnalysisResult> {
  const domain = parsed.hostname;
  const isHttps = parsed.protocol === "https:";

  // Initialize result
  const result: UrlAnalysisResult = {
    url,
    domain,
    isHttps,
    hasValidSsl: null,
    sslIssuer: null,
    domainAgeDays: null,
    registrar: null,
    ipAddress: null,
    country: null,
    httpStatus: null,
    redirectCount: 0,
    redirectChain: [],
    securityHeaders: {},
    hasLoginForm: false,
    hasPaymentForm: false,
    dnsRecords: {},
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const MAX_REDIRECTS = 5;
    const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
    let currentUrl = url;
    const redirectChain: string[] = [];
    let redirectCount = 0;

    while (redirectCount <= MAX_REDIRECTS) {
      const response = await fetch(currentUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ScamShield/1.0; +https://scamshield.app)",
          "Accept": "text/html,application/json",
        },
      });

      clearTimeout(timeoutId);

      // Handle redirect
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        if (redirectCount >= MAX_REDIRECTS) {
          result.httpStatus = response.status;
          result.redirectCount = MAX_REDIRECTS;
          result.redirectChain = redirectChain;
          break;
        }
        const location = response.headers.get("location")!;
        currentUrl = new URL(location, currentUrl).toString();
        redirectChain.push(currentUrl);
        redirectCount++;
        continue;
      }

      result.httpStatus = response.status;
      result.redirectCount = redirectCount;
      result.redirectChain = redirectChain;

      // Read response with size limit
      const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
      if (contentLength > MAX_RESPONSE_BYTES) {
        // Response too large — stream and truncate
        const reader = response.body?.getReader();
        if (reader) {
          let totalBytes = 0;
          let chunks = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done || !value) break;
            totalBytes += value.length;
            if (totalBytes > MAX_RESPONSE_BYTES) break;
            chunks += new TextDecoder().decode(value);
          }
          // Parse truncated HTML for form detection
          try {
            result.hasLoginForm = detectLoginForm(chunks);
            result.hasPaymentForm = detectPaymentForm(chunks);
          } catch { /* ignore parse errors on truncated content */ }
        }
      } else {
        const html = await response.text();
        result.hasLoginForm = detectLoginForm(html);
        result.hasPaymentForm = detectPaymentForm(html);
      }

      // Extract security headers
      const headers = response.headers;
      result.securityHeaders = {
        "X-Frame-Options": headers.get("x-frame-options") || false,
        "X-Content-Type-Options": headers.get("x-content-type-options") || false,
        "Strict-Transport-Security": headers.get("strict-transport-security") || false,
        "Content-Security-Policy": headers.get("content-security-policy") || false,
      };

      // Check SSL certificate (for HTTPS)
      if (isHttps) {
        result.hasValidSsl = true;
      }

      break;
    }

    if (redirectCount > MAX_REDIRECTS) {
      result.hasLoginForm = false;
      result.hasPaymentForm = false;
    }
  } catch {
    // Fetch failed - could be various reasons
    result.httpStatus = null;
  }

  return result;
}

/**
 * Detect login forms in HTML
 */
function detectLoginForm(html: string): boolean {
  const loginPatterns = [
    /<form[^>]*>[\s\S]*?<input[^>]*type=["']?password["']?/i,
    /<input[^>]*type=["']?password["']?[^>]*>/i,
    /name=["']?(password|passwd|pass|pwd)["']?/i,
    /id=["']?(password|passwd|pass|pwd)["']?/i,
    /placeholder=["']*(password|senha|contraseña)/i,
  ];

  return loginPatterns.some((pattern) => pattern.test(html));
}

/**
 * Detect payment/credit card forms in HTML
 */
function detectPaymentForm(html: string): boolean {
  const paymentPatterns = [
    /credit.?card/i,
    /card.?number/i,
    /cvv|cvc/i,
    /expiry|expir/i,
    /payment/i,
    /checkout/i,
    /billing/i,
    /name=["']?(cc|card|credit)/i,
  ];

  return paymentPatterns.some((pattern) => pattern.test(html));
}

/**
 * Generate risk summary
 */
function generateSummary(score: number, riskLevel: string, domain: string): string {
  if (score >= 80) {
    return `This website (${domain}) shows multiple indicators commonly associated with phishing or fraudulent websites. We strongly recommend avoiding this site.`;
  }
  if (score >= 60) {
    return `This website (${domain}) shows several suspicious indicators. Exercise caution and verify the website through other means before providing any information.`;
  }
  if (score >= 40) {
    return `This website (${domain}) has some characteristics that warrant caution. While not definitively suspicious, we recommend verifying its legitimacy.`;
  }
  if (score >= 20) {
    return `This website (${domain}) appears relatively safe based on available signals. However, always verify you're on the correct website before entering sensitive information.`;
  }
  return `No significant risk indicators were detected for ${domain}. This does not guarantee the website is safe - always use caution with sensitive information.`;
}

/**
 * Generate recommendations based on risk level
 */
function generateRecommendations(score: number, riskLevel: string, indicators: RiskIndicator[]): string[] {
  const recommendations: string[] = [];

  if (score >= 60) {
    recommendations.push("Do not enter your password, payment information, or personal details on this website.");
    recommendations.push("If you expected this to be a legitimate website, navigate there directly by typing the address yourself.");
  }

  if (indicators.some((i) => i.title.includes("brand impersonation"))) {
    recommendations.push("This website may be impersonating a legitimate brand. Verify the official website directly.");
  }

  if (indicators.some((i) => i.title.includes("HTTPS"))) {
    recommendations.push("Never enter sensitive information on a website without HTTPS encryption.");
  }

  if (indicators.some((i) => i.severity === "critical" || i.severity === "high")) {
    recommendations.push("We recommend avoiding this website entirely.");
  }

  if (score < 40) {
    recommendations.push("Always verify you're on the correct website before entering credentials.");
    recommendations.push("Look for the padlock icon in your browser's address bar.");
  }

  return recommendations;
}

/**
 * Categorize the type of risk
 */
import type { ScanCategory } from "@/types/scan";

function categorizeRisk(riskLevel: string, indicators: RiskIndicator[]): ScanCategory {
  const hasImpersonation = indicators.some((i) => i.title.toLowerCase().includes("impersonation"));
  const hasLogin = indicators.some((i) => i.title.toLowerCase().includes("login"));
  const hasPayment = indicators.some((i) => i.title.toLowerCase().includes("payment"));

  if (hasImpersonation) return "phishing";
  if (hasLogin && riskLevel !== "MINIMAL") return "phishing";
  if (hasPayment && riskLevel !== "MINIMAL") return "payment_fraud";

  return "suspicious_website";
}

/**
 * Create error result
 */
 
function createErrorResult(error: string, inputPreview: string, inputHash: string): ScanResult {
  return {
    id: crypto.randomUUID(),
    scanType: "url",
    inputPreview,
    inputHash,
    riskScore: 50,
    riskLevel: "moderate",
    category: null,
    summary: `Unable to analyze URL: ${error}`,
    indicators: [
      {
        severity: "medium",
        category: "technical",
        title: "Unable to analyze",
        description: error,
      },
    ],
    recommendations: ["The URL could not be analyzed. Please verify the website manually."],
    createdAt: new Date(),
  };
}

/**
 * Fire AI analysis in background (non-blocking).
 * Results are saved to DB independently of the scan result.
 */
async function runAiAnalysis(result: ScanResult): Promise<void> {
  try {
    const context = {
      scanType: "url" as const,
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
      // Update the stored score with the AI-bounded adjustment
      // This is best-effort; if it fails, the deterministic score stands
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

/**
 * Create partial result when fetch fails but URL can still be analyzed
 */
function createPartialResult(
  url: string,
  domain: string,
  inputPreview: string,
  inputHash: string,
  error?: string
): ScanResult {
  // Score only URL-based signals
  const signals = scoreUrlSignals(url, domain);
  const { score, riskLevel, indicators } = aggregateSignals(signals);

  // Add a warning about limited analysis
  indicators.push({
    severity: "medium",
    category: "technical",
    title: "Limited analysis available",
    description: error || "The website could not be reached for full analysis. Assessment is based on URL structure only.",
  });

  // Boost score for unresolvable domains, especially when lookalike/impersonation detected
  const hasLookalike = signals.some((s) => s.id === "lookalike_domain" || s.id === "brand_impersonation_compound");
  const boost = hasLookalike ? 25 : 20;

  return {
    id: crypto.randomUUID(),
    scanType: "url",
    inputPreview,
    inputHash,
    riskScore: Math.min(score + boost, 100), // Add risk boost for unknown resolution
    riskLevel: riskLevel.toLowerCase() as ScanResult["riskLevel"],
    category: null,
    summary: generateSummary(score, riskLevel, domain),
    indicators,
    recommendations: [
      "Full analysis was not possible. Verify this website manually before providing any information.",
      ...generateRecommendations(score, riskLevel, indicators),
    ],
    createdAt: new Date(),
  };
}
