// Scan types
export type ScanType = "url" | "message" | "job";

export type RiskLevel = "minimal" | "low" | "moderate" | "high" | "critical";

export type Severity = "critical" | "high" | "medium" | "low" | "positive";

export type ScanCategory =
  | "phishing"
  | "job_scam"
  | "romance_scam"
  | "investment_scam"
  | "tech_support"
  | "lottery_scam"
  | "impersonation"
  | "malware"
  | "payment_fraud"
  | "suspicious_website"
  | "credential_theft"
  | "prize_scam"
  | "advance_fee"
  | "romance"
  | "money_mule"
  | "threat"
  | "urgency"
  | "suspicious_message"
  | "other";

// Risk indicator
export interface RiskIndicator {
  id?: string;
  severity: Severity;
  category?: string;
  title: string;
  description?: string;
  evidence?: string;
}

// URL analysis result
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

// Message analysis result
export interface MessageAnalysisResult {
  messageType: "sms" | "email" | "social" | "messenger" | "unknown";
  detectedLinks: string[];
  detectedPhones: string[];
  detectedEmails: string[];
  detectedUrls: string[];
  language: string | null;
}

// Job analysis result
export interface JobAnalysisResult {
  companyName: string | null;
  jobTitle: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  salaryRange: string | null;
  location: string | null;
  remoteStatus: "remote" | "onsite" | "hybrid" | null;
  employmentType: string | null;
  jobType: string | null;
  contactMethod: string | null;
  applicationMethod: string | null;
  extractedUrls: string[];
  extractedEmails: string[];
  extractedPhones: string[];
  redFlags: string[];
  positiveSignals: string[];
  category: string | null;
  urlAnalysisResults: Array<{ url: string; score: number; riskLevel: string }>;
}

// Full scan result
export interface ScanResult {
  id: string;
  scanType: ScanType;
  inputPreview: string;
  inputHash: string;
  riskScore: number;
  riskLevel: RiskLevel;
  category: ScanCategory | null;
  summary: string;
  indicators: RiskIndicator[];
  recommendations: string[];
  urlAnalysis?: UrlAnalysisResult;
  messageAnalysis?: MessageAnalysisResult;
  jobAnalysis?: JobAnalysisResult;
  createdAt: Date;
}

// API request types
export interface UrlScanRequest {
  url: string;
}

export interface MessageScanRequest {
  message: string;
  messageType?: "sms" | "email" | "social" | "messenger";
}

export interface JobScanRequest {
  jobDescription: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Scoring signal
export interface ScoringSignal {
  id: string;
  score: number;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  evidence?: string;
}
