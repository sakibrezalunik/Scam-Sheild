/**
 * ScamShield Extension — Shared Types
 *
 * These types mirror the backend response contract from /api/scans/url.
 * The extension must not invent its own risk engine — it only displays
 * what the backend returns.
 */

// ─── Risk Levels (must match backend RISK_LEVELS) ─────────────────────
export type RiskLevel = "minimal" | "low" | "moderate" | "high" | "critical";

// ─── Indicator Severity ────────────────────────────────────────────────
export type Severity = "critical" | "high" | "medium" | "low" | "positive";

// ─── Scan Indicator ────────────────────────────────────────────────────
export interface ScanIndicator {
  severity: Severity;
  category?: string;
  title: string;
  description?: string;
  evidence?: string;
}

// ─── URL Analysis (optional — may be undefined for pure URL analysis) ──
export interface UrlAnalysisResult {
  url: string;
  domain: string | null;
  isHttps: boolean;
  hasValidSsl: boolean | null;
  sslIssuer: string | null;
  domainAgeDays: number | null;
  registrar: string | null;
  ipAddress: string | null;
  country: string | null;
  httpStatus: number | null;
  redirectCount: number;
  redirectChain: string[];
  securityHeaders: Record<string, string | boolean>;
  hasLoginForm: boolean;
  hasPaymentForm: boolean;
  dnsRecords: Record<string, string[]>;
}

// ─── Scan Result (payload from /api/scans/url POST body .data) ─────────
export interface ScanResult {
  id: string;
  scanType: "url";
  inputPreview: string;
  inputHash: string;
  riskScore: number;
  riskLevel: RiskLevel;
  category: string | null;
  summary: string;
  indicators: ScanIndicator[];
  recommendations: string[];
  urlAnalysis?: UrlAnalysisResult;
  aiAnalysis?: unknown;
  createdAt: string;
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
    details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Extension Popup States ────────────────────────────────────────────
export type PopupState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; scan: ScanResult }
  | { kind: "error"; message: string; code?: string }
  | { kind: "unsupported" }
  | { kind: "rate-limited" }
  | { kind: "invalid-url" };

// ─── Extension Messaging Protocol ──────────────────────────────────────
export type ExtensionMessage =
  | { type: "SCAN_URL"; url: string }
  | { type: "SCAN_RESULT"; result: ScanResult }
  | { type: "SCAN_ERROR"; message: string; code?: string }
  | { type: "RATE_LIMITED" }
  | { type: "UNSUPPORTED_PAGE" }
  | { type: "INVALID_URL" };
