import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Plus, Clock, FileText, Link as LinkIcon, Lightbulb, AlertTriangle, CheckCircle, Minus, Globe, MessageSquare, Settings, ChevronDown, Brain, Briefcase } from "lucide-react";
import { getSessionUser } from "@/lib/auth/middleware";
import { getAiAnalysisForScan } from "@/services/ai/ai-analyzer";
import Logo from "@/components/Logo";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) return { title: "Scan Not Found — ScamShield" };
  const riskLevel = (scan.riskLevel ?? "low").toUpperCase();
  return {
    title: `Scan Results — ${riskLevel} Risk | ScamShield`,
    description: `Risk assessment for ${scan.scanType}: ${riskLevel} risk (${scan.riskScore ?? 0}/100). View detailed indicators and recommendations.`,
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

type Severity = "critical" | "high" | "medium" | "low" | "positive";
type RiskLevel = "minimal" | "low" | "moderate" | "high" | "critical";

interface Indicator {
  id: string;
  severity: Severity;
  category: string | null;
  title: string;
  description: string | null;
  evidence: string | null;
}

interface UrlAnalysis {
  url: string;
  domain: string | null;
  isHttps: boolean | null;
  httpStatus: number | null;
  redirectCount: number | null;
  hasLoginForm: boolean | null;
  hasPaymentForm: boolean | null;
  securityHeaders: Record<string, boolean | string | null> | null;
  redirectChain: unknown[] | null;
}

interface MsgAnalysis {
  messageType: string | null;
  detectedUrls: unknown[] | null;
  detectedPhones: unknown[] | null;
  detectedEmails: unknown[] | null;
  language: string | null;
}

interface JobAnalysisData {
  companyName: string | null;
  jobTitle: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  salaryRange: string | null;
  location: string | null;
  remoteStatus: string | null;
  employmentType: string | null;
  jobType: string | null;
  contactMethod: string | null;
  applicationMethod: string | null;
  extractedUrls: unknown[] | null;
  extractedEmails: unknown[] | null;
  extractedPhones: unknown[] | null;
  redFlags: unknown[] | null;
  positiveSignals: unknown[] | null;
  category: string | null;
  urlAnalysisResults: unknown[] | null;
}

interface ScanData {
  id: string;
  scanType: string;
  userId: string | null;
  inputPreview: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  category: string | null;
  summary: string | null;
  createdAt: Date;
  indicators: Indicator[];
  urlAnalysis: UrlAnalysis | null;
  msgAnalysis: MsgAnalysis | null;
  jobAnalysis: JobAnalysisData | null;
  recommendations: string[];
}

/**
 * Regenerate recommendations from stored indicators (not persisted in DB).
 */
function generateRecommendations(scan: ScanData): string[] {
  const recs: string[] = [];
  const score = scan.riskScore ?? 0;
  const indicators = scan.indicators;

  if (score >= 60) {
    recs.push("Do not enter your password, payment information, or personal details on this target.");
    recs.push("If you expected this to be legitimate, navigate there directly by typing the address yourself.");
  }

  const hasImpersonation = indicators.some((i) => i.title.toLowerCase().includes("impersonation"));
  const hasLogin = indicators.some((i) => i.title.toLowerCase().includes("login"));
  const hasPayment = indicators.some((i) => i.title.toLowerCase().includes("payment"));
  const hasUrgency = indicators.some((i) => i.category === "urgency" || i.title.toLowerCase().includes("urgency"));
  const hasCredential = indicators.some((i) => i.category === "credential_theft");
  const hasPhishing = indicators.some((i) => i.category === "phishing");
  const hasThreat = indicators.some((i) => i.severity === "critical" || i.severity === "high");

  if (hasImpersonation) {
    recs.push("This target may be impersonating a legitimate brand. Verify the official source directly.");
  }
  if (hasLogin && score >= 40) {
    recs.push("Never enter credentials on a site flagged for suspicious login forms.");
  }
  if (hasPayment && score >= 40) {
    recs.push("Avoid any payment or financial transaction on this target.");
  }
  if (hasCredential) {
    recs.push("Never share passwords, PINs, or verification codes.");
  }
  if (hasPhishing) {
    recs.push("Do not click any links in unsolicited messages. Type the URL directly.");
  }
  if (hasThreat) {
    recs.push("We recommend avoiding this target entirely.");
  }
  if (hasUrgency) {
    recs.push("Take time to verify claims through official channels. Scammers create urgency to prevent clear thinking.");
  }
  if (score < 40) {
    recs.push("Always verify you are on the correct website before entering credentials.");
    recs.push("Look for the padlock icon in your browser&apos;s address bar.");
  }

  return recs.length > 0 ? recs : ["No specific recommendations at this time. Continue to practice good security hygiene."];
}

export default async function ResultsPage({ params }: PageProps) {
  const { id } = await params;

  // Check ownership if authenticated
  const sessionUser = await getSessionUser();
  const scan = (await prisma.scan.findUnique({
    where: { id },
    include: {
      indicators: { orderBy: { severity: "asc" } },
      urlAnalysis: true,
      msgAnalysis: true,
      jobAnalysis: true,
    },
  })) as ScanData | null;

  if (!scan) {
    notFound();
  }

  // Enforce ownership: authenticated scans only accessible by owner
  if (scan.userId && (!sessionUser || sessionUser.id !== scan.userId)) {
    notFound();
  }

  // Fetch AI analysis separately
  const aiAnalysis = await getAiAnalysisForScan(id);

  const recommendations = generateRecommendations(scan);

  // Sort: negative first, then positive
  const sortedIndicators = [...scan.indicators].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, positive: 4 };
    return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
  });

  const suspicious = sortedIndicators.filter((i) => i.severity !== "positive");
  const positive = sortedIndicators.filter((i) => i.severity === "positive");

  const riskLevel = (scan.riskLevel ?? "low") as RiskLevel;
  const riskScore = scan.riskScore ?? 0;
  const inputPreview = scan.inputPreview ?? scan.id;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative z-10">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            {sessionUser && (
              <Link
                href="/dashboard"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            )}
            <Link
              href="/scan"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
            >
              <Plus className="h-4 w-4" />
              Scan Another
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Risk Summary Card */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Risk Gauge */}
              <RiskGauge score={riskScore} riskLevel={riskLevel} />

              {/* Risk Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
                  <RiskBadge level={riskLevel} />
                  {scan.category && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {formatCategory(scan.category)}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                  Scan Results
                  <span className="sr-only"> — Risk score {riskScore} out of 100, {riskLevel} risk</span>
                </h1>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {scan.summary ?? "Analysis complete."}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slate-500 dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(scan.createdAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {scan.scanType === "url" ? "Website Scan" : scan.scanType === "job" ? "Job Offer Scan" : "Message Scan"}
                  </span>
                  <span className="flex items-center gap-1 max-w-[200px] md:max-w-xs truncate">
                    <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate font-mono text-xs">{inputPreview}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Recommendations
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-600 mb-4">
              Generated from detected risk indicators — use as guidance, not a definitive verdict.
            </p>
            <ul className="space-y-3">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-500" aria-hidden="true" />
              Risk Indicators
              <span className="ml-auto text-sm font-normal text-slate-500 dark:text-slate-400">
                {suspicious.length} {suspicious.length === 1 ? "detected" : "detected"}
              </span>
            </h2>

            {suspicious.length > 0 ? (
              <div className="space-y-3">
                {suspicious.map((ind) => (
                  <IndicatorRow key={ind.id} indicator={ind} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg" role="status">
                <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                No suspicious indicators detected.
              </div>
            )}

            {positive.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">
                  Positive Signals
                </h3>
                <div className="space-y-2">
                  {positive.map((ind) => (
                    <div key={ind.id} className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{ind.title}</p>
                        {ind.description && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">{ind.description}</p>
                        )}
                        {ind.evidence && (
                          <p className="text-xs text-emerald-500 dark:text-emerald-600 mt-1 font-mono">{ind.evidence}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* URL Analysis Section */}
        {scan.urlAnalysis && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-slate-500" />
                URL Analysis
              </h2>
              <UrlAnalysisSection analysis={scan.urlAnalysis} />
            </div>
          </div>
        )}

        {/* Message Analysis Section */}
        {scan.msgAnalysis && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-500" />
                Message Analysis
              </h2>
              <MessageAnalysisSection analysis={scan.msgAnalysis} />
            </div>
          </div>
        )}

        {/* Job Analysis Section */}
        {scan.jobAnalysis && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-slate-500" />
                Job Analysis
              </h2>

              {/* Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Posting Details</h3>
                  {scan.jobAnalysis.companyName && <InfoRow label="Company" value={scan.jobAnalysis.companyName} />}
                  {scan.jobAnalysis.jobTitle && <InfoRow label="Job Title" value={scan.jobAnalysis.jobTitle} />}
                  {scan.jobAnalysis.employmentType && <InfoRow label="Employment Type" value={scan.jobAnalysis.employmentType} />}
                  {scan.jobAnalysis.remoteStatus && <InfoRow label="Work Location" value={scan.jobAnalysis.remoteStatus.charAt(0).toUpperCase() + scan.jobAnalysis.remoteStatus.slice(1) + (scan.jobAnalysis.location ? ` (${scan.jobAnalysis.location})` : "")} />}
                  {scan.jobAnalysis.salaryRange && <InfoRow label="Salary" value={scan.jobAnalysis.salaryRange} />}
                  {scan.jobAnalysis.jobType && <InfoRow label="Level" value={scan.jobAnalysis.jobType} />}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Contact Information</h3>
                  {scan.jobAnalysis.recruiterName && <InfoRow label="Recruiter" value={scan.jobAnalysis.recruiterName} />}
                  {scan.jobAnalysis.recruiterEmail && <InfoRow label="Recruiter Email" value={scan.jobAnalysis.recruiterEmail} mono />}
                  {scan.jobAnalysis.recruiterPhone && <InfoRow label="Recruiter Phone" value={scan.jobAnalysis.recruiterPhone} mono />}
                  {scan.jobAnalysis.contactMethod && scan.jobAnalysis.contactMethod !== "unknown" && (
                    <InfoRow label="Contact Method" value={scan.jobAnalysis.contactMethod} />
                  )}
                </div>
              </div>

              {/* Extracted Entities */}
              {(scan.jobAnalysis.extractedUrls?.length || scan.jobAnalysis.extractedEmails?.length || scan.jobAnalysis.extractedPhones?.length) && (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Extracted Entities</h3>
                  <div className="space-y-2">
                    {Array.isArray(scan.jobAnalysis.extractedUrls) && scan.jobAnalysis.extractedUrls.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">URLs ({(scan.jobAnalysis.extractedUrls as string[]).length})</p>
                        <div className="space-y-1">
                          {(scan.jobAnalysis.extractedUrls as string[]).map((u, i) => (
                            <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{u}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(scan.jobAnalysis.extractedEmails) && scan.jobAnalysis.extractedEmails.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Emails ({(scan.jobAnalysis.extractedEmails as string[]).length})</p>
                        <div className="space-y-1">
                          {(scan.jobAnalysis.extractedEmails as string[]).map((e, i) => (
                            <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{e}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(scan.jobAnalysis.extractedPhones) && scan.jobAnalysis.extractedPhones.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Phone Numbers ({(scan.jobAnalysis.extractedPhones as string[]).length})</p>
                        <div className="space-y-1">
                          {(scan.jobAnalysis.extractedPhones as string[]).map((p, i) => (
                            <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">{p}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* URL Analysis Results */}
              {scan.jobAnalysis.urlAnalysisResults && scan.jobAnalysis.urlAnalysisResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Embedded URL Analysis</h3>
                  <div className="space-y-2">
                    {(scan.jobAnalysis.urlAnalysisResults as Array<{ url: string; score: number; riskLevel: string }>).map((ua, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          ua.score >= 60 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          ua.score >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {ua.score}/100
                        </span>
                        <span className={`text-xs font-medium ${
                          ua.score >= 60 ? "text-red-600 dark:text-red-400" :
                          ua.score >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                          "text-blue-600 dark:text-blue-400"
                        }`}>
                          {ua.riskLevel.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate">{ua.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Red Flags */}
              {scan.jobAnalysis.redFlags && scan.jobAnalysis.redFlags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-3">
                    Red Flags ({scan.jobAnalysis.redFlags.length})
                  </h3>
                  <ul className="space-y-1">
                    {(scan.jobAnalysis.redFlags as string[]).map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Positive Signals */}
              {scan.jobAnalysis.positiveSignals && scan.jobAnalysis.positiveSignals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-3">
                    Positive Signals ({scan.jobAnalysis.positiveSignals.length})
                  </h3>
                  <ul className="space-y-1">
                    {(scan.jobAnalysis.positiveSignals as string[]).map((sig, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {sig}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Assessment Section */}
        {aiAnalysis && aiAnalysis.status === "success" && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Supplemental Analysis</h2>
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                  {aiAnalysis.model} · {aiAnalysis.confidence}% confidence
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                AI analysis supplements — it does not replace — the deterministic scan above. The risk score is determined by pattern matching only.
              </p>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
                {aiAnalysis.assessment}
              </p>
              {aiAnalysis.reasoning && (
                <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                    AI Reasoning
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aiAnalysis.reasoning}
                  </p>
                </div>
              )}
              {aiAnalysis.additionalIndicators.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Additional Insights
                  </p>
                  <ul className="space-y-1">
                    {aiAnalysis.additionalIndicators.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Minus className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAnalysis.recommendations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    AI Recommendations
                  </p>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <CheckCircle className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI unavailable notice */}
        {!aiAnalysis && (
          <div className="max-w-4xl mx-auto mb-8" role="note">
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI supplemental analysis is currently unavailable. The deterministic analysis above provides reliable risk assessment based on pattern matching.
              </p>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <TechnicalDetails scan={{
          id: scan.id,
          scanType: scan.scanType,
          userId: null,
          inputPreview: scan.inputPreview ?? "",
          riskScore: scan.riskScore ?? 0,
          riskLevel: scan.riskLevel ?? "low",
          category: scan.category,
          summary: scan.summary ?? "",
          recommendations,
          indicators: scan.indicators,
          urlAnalysis: scan.urlAnalysis ?? null,
          msgAnalysis: scan.msgAnalysis ?? null,
          jobAnalysis: scan.jobAnalysis ? {
            companyName: scan.jobAnalysis.companyName,
            jobTitle: scan.jobAnalysis.jobTitle,
            recruiterName: scan.jobAnalysis.recruiterName,
            recruiterEmail: scan.jobAnalysis.recruiterEmail,
            recruiterPhone: scan.jobAnalysis.recruiterPhone,
            salaryRange: scan.jobAnalysis.salaryRange,
            location: scan.jobAnalysis.location,
            remoteStatus: scan.jobAnalysis.remoteStatus,
            employmentType: scan.jobAnalysis.employmentType,
            jobType: scan.jobAnalysis.jobType,
            contactMethod: scan.jobAnalysis.contactMethod,
            applicationMethod: scan.jobAnalysis.applicationMethod,
            extractedUrls: scan.jobAnalysis.extractedUrls,
            extractedEmails: scan.jobAnalysis.extractedEmails,
            extractedPhones: scan.jobAnalysis.extractedPhones,
            redFlags: scan.jobAnalysis.redFlags,
            positiveSignals: scan.jobAnalysis.positiveSignals,
            category: scan.jobAnalysis.category,
            urlAnalysisResults: scan.jobAnalysis.urlAnalysisResults,
          } : null,
          createdAt: scan.createdAt,
        }} />

        {/* Responsible Communication Disclaimer */}
        <div className="max-w-4xl mx-auto mt-6">
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center leading-relaxed">
            This risk assessment is generated by automated pattern matching and should be used as a supplement to, not a replacement for, your own judgment.
            A low risk score does not guarantee safety, and a high score does not definitively confirm a scam. Always verify through official channels.
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function RiskGauge({ score, riskLevel }: { score: number; riskLevel: RiskLevel }) {
  const ringColor: Record<RiskLevel, string> = {
    minimal: "#10b981",
    low: "#22c55e",
    moderate: "#eab308",
    high: "#f97316",
    critical: "#ef4444",
  };
  const textColor: Record<RiskLevel, string> = {
    minimal: "text-emerald-500",
    low: "text-green-500",
    moderate: "text-yellow-500",
    high: "text-orange-500",
    critical: "text-red-500",
  };
  const levelLabel: Record<RiskLevel, string> = {
    minimal: "Minimal",
    low: "Low",
    moderate: "Moderate",
    high: "High",
    critical: "Critical",
  };

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const ring = ringColor[riskLevel];
  const text = textColor[riskLevel];

  return (
    <div className="relative w-28 h-28 flex-shrink-0" role="img" aria-label={`Risk score: ${score} out of 100, ${levelLabel[riskLevel]} risk`}>
      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-200 dark:text-slate-700" />
        <circle
          cx="50" cy="50" r="45"
          stroke={ring}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${text}`}>{score}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">risk score</span>
        <span className="text-xs font-medium text-slate-400 dark:text-slate-600 mt-0.5 capitalize">{riskLevel}</span>
      </div>
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const cls: Record<RiskLevel, string> = {
    minimal: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${cls[level]}`} role="status">
      {level} risk
    </span>
  );
}

function IndicatorRow({ indicator }: { indicator: Indicator }) {
  const colorMap: Record<string, string> = {
    critical: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
    high: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20",
    medium: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
    low: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
  };
  const iconCls: Record<string, string> = {
    critical: "text-red-500",
    high: "text-orange-500",
    medium: "text-yellow-500",
    low: "text-blue-500",
  };
  const badgeCls: Record<string, string> = {
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const Icon = indicator.severity === "critical" || indicator.severity === "high"
    ? AlertTriangle
    : indicator.severity === "medium"
    ? Minus
    : CheckCircle;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${colorMap[indicator.severity] ?? "border-l-slate-300 bg-slate-50"}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconCls[indicator.severity] ?? "text-slate-400"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{indicator.title}</p>
        {indicator.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{indicator.description}</p>
        )}
        {indicator.evidence && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono truncate">{indicator.evidence}</p>
        )}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls[indicator.severity] ?? "bg-slate-100 text-slate-600"}`}>
        {indicator.severity}
      </span>
    </div>
  );
}

function UrlAnalysisSection({ analysis }: { analysis: UrlAnalysis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">URL Details</h3>
        <InfoRow label="URL" value={analysis.url} mono />
        {analysis.domain && <InfoRow label="Domain" value={analysis.domain} />}
        <InfoRow
          label="HTTPS"
          value={analysis.isHttps === null ? "Unknown" : analysis.isHttps ? "Yes" : "No"}
          badgeColor={analysis.isHttps ? "emerald" : analysis.isHttps === false ? "red" : undefined}
        />
        <InfoRow label="HTTP Status" value={analysis.httpStatus ?? "N/A"} />
        <InfoRow
          label="Redirects"
          value={analysis.redirectCount ?? 0}
          badgeColor={(analysis.redirectCount ?? 0) > 2 ? "red" : undefined}
        />
        <InfoRow
          label="Login Form"
          value={analysis.hasLoginForm === null ? "Unknown" : analysis.hasLoginForm ? "Yes" : "No"}
          badgeColor={analysis.hasLoginForm ? "red" : analysis.hasLoginForm === false ? "emerald" : undefined}
        />
        <InfoRow
          label="Payment Form"
          value={analysis.hasPaymentForm === null ? "Unknown" : analysis.hasPaymentForm ? "Yes" : "No"}
          badgeColor={analysis.hasPaymentForm ? "red" : analysis.hasPaymentForm === false ? "emerald" : undefined}
        />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Security Headers</h3>
        {analysis.securityHeaders && Object.keys(analysis.securityHeaders).length > 0 ? (
          Object.entries(analysis.securityHeaders).map(([header, value]) => (
            <InfoRow
              key={header}
              label={header}
              value={value ? "Present" : "Missing"}
              badgeColor={value ? "emerald" : "red"}
            />
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No security header data available.</p>
        )}
      </div>
    </div>
  );
}

function MessageAnalysisSection({ analysis }: { analysis: MsgAnalysis }) {
  const urls = (analysis.detectedUrls ?? []) as string[];
  const phones = (analysis.detectedPhones ?? []) as string[];
  const emails = (analysis.detectedEmails ?? []) as string[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Message Properties</h3>
        <InfoRow label="Message Type" value={analysis.messageType ?? "unknown"} />
        <InfoRow label="Language" value={analysis.language ?? "unknown"} />
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Detected Entities</h3>
        {urls.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Links ({urls.length})</p>
            <div className="space-y-1">
              {urls.map((u, i) => (
                <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">{u}</p>
              ))}
            </div>
          </div>
        )}
        {phones.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phone Numbers ({phones.length})</p>
            <div className="space-y-1">
              {phones.map((p, i) => (
                <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">{p}</p>
              ))}
            </div>
          </div>
        )}
        {emails.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Emails ({emails.length})</p>
            <div className="space-y-1">
              {emails.map((e, i) => (
                <p key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">{e}</p>
              ))}
            </div>
          </div>
        )}
        {urls.length === 0 && phones.length === 0 && emails.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No external entities detected.</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, badgeColor, mono }: { label: string; value: string | number; badgeColor?: string; mono?: boolean }) {
  const badgeCls = badgeColor === "emerald"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
    : badgeColor === "red"
    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    : undefined;

  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">{label}</span>
      {badgeCls ? (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeCls}`}>{value}</span>
      ) : (
        <span className={`text-sm text-slate-900 dark:text-white text-right ${mono ? "font-mono" : ""} truncate max-w-[60%]`}>{value}</span>
      )}
    </div>
  );
}

function formatCategory(cat: string): string {
  return cat.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function TechnicalDetails({ scan }: { scan: ScanData }) {
  return (
    <details className="max-w-4xl mx-auto group">
      <summary className="list-none cursor-pointer bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <span className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-500" />
          Technical Details
        </span>
        <ChevronDown className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
          {JSON.stringify(scan, null, 2)}
        </pre>
      </div>
    </details>
  );
}
