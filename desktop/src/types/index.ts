/**
 * ScamShield Desktop — Shared Types
 *
 * Mirrors the backend response contract from /api/scans/* endpoints.
 * Aligned with Prisma schema and extension types.
 */

// ─── Risk Levels (must match backend RISK_LEVELS) ─────────────────────
export type RiskLevel = "minimal" | "low" | "moderate" | "high" | "critical";

// ─── Indicator Severity ────────────────────────────────────────────────
export type Severity = "critical" | "high" | "medium" | "low" | "positive";

// ─── Scan Type ─────────────────────────────────────────────────────────
export type ScanType = "url" | "message" | "job";

// ─── Scan Indicator ────────────────────────────────────────────────────
export interface ScanIndicator {
  id: string;
  severity: Severity;
  category: string | null;
  title: string;
  description: string | null;
  evidence: string | null;
  createdAt: string;
}

// ─── URL Analysis ──────────────────────────────────────────────────────
export interface UrlAnalysis {
  id: string;
  scanId: string;
  url: string;
  domain: string | null;
  isHttps: boolean | null;
  hasValidSsl: boolean | null;
  sslIssuer: string | null;
  domainAgeDays: number | null;
  registrar: string | null;
  ipAddress: string | null;
  country: string | null;
  httpStatus: number | null;
  redirectCount: number | null;
  redirectChain: unknown[] | null;
  securityHeaders: Record<string, string | boolean | null> | null;
  hasLoginForm: boolean | null;
  hasPaymentForm: boolean | null;
  dnsRecords: Record<string, string[]> | null;
  createdAt: string;
}

// ─── Message Analysis ──────────────────────────────────────────────────
export interface MessageAnalysis {
  id: string;
  scanId: string;
  messageType: string | null;
  detectedLinks: unknown[] | null;
  detectedPhones: unknown[] | null;
  detectedEmails: unknown[] | null;
  detectedUrls: unknown[] | null;
  language: string | null;
  createdAt: string;
}

// ─── Job Analysis ──────────────────────────────────────────────────────
export interface JobAnalysis {
  id: string;
  scanId: string;
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
  createdAt: string;
}

// ─── AI Analysis ───────────────────────────────────────────────────────
export interface AiAnalysis {
  id: string;
  scanId: string;
  provider: string;
  model: string;
  assessment: string;
  confidence: number;
  reasoning: string | null;
  additionalIndicators: string[];
  recommendations: string[];
  status: string;
  createdAt: string;
}

// ─── Scan Result (from GET /api/scans/[id] — userId and inputHash stripped)
export interface ScanResult {
  id: string;
  scanType: ScanType;
  userId: string | null;
  inputPreview: string | null;
  inputHash?: string; // may be present from POST, stripped from GET
  riskScore: number | null;
  riskLevel: string | null;
  category: string | null;
  summary: string | null;
  createdAt: string;
  indicators: ScanIndicator[];
  urlAnalysis: UrlAnalysis | null;
  msgAnalysis: MessageAnalysis | null;
  jobAnalysis: JobAnalysis | null;
  recommendations: string[];
  aiAnalysis: AiAnalysis | null;
}

// ─── API Response wrapper ──────────────────────────────────────────────
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code?: string;
    message: string;
    limit?: number;
    used?: number;
    resetAt?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Auth ──────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface DashboardStats {
  total: number;
  urlCount: number;
  msgCount: number;
  jobCount: number;
}

// ─── Scan History Item (local cache) ───────────────────────────────────
export interface ScanHistoryItem {
  id: string;
  scanType: ScanType;
  inputPreview: string | null;
  riskScore: number | null;
  riskLevel: string | null;
  category: string | null;
  summary: string | null;
  createdAt: string;
}

// ─── App Navigation State ──────────────────────────────────────────────
export type AppView =
  | { kind: "home" }
  | { kind: "scan"; type?: ScanType }
  | { kind: "results"; id: string }
  | { kind: "history" }
  | { kind: "login" }
  | { kind: "settings" };
