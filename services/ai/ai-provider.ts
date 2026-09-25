/**
 * AI Provider Abstraction for ScamShield
 *
 * Defines the interface that all AI providers must implement.
 * The OpenAI provider is the default implementation.
 */

export interface AiProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface AiAnalysisResult {
  assessment: string;
  confidence: number; // 0-100
  reasoning: string;
  additionalInsights: string[];
  recommendations: string[];
  status: "success" | "error" | "unavailable";
  error?: string;
}

export interface AiScanContext {
  scanType: "url" | "message" | "job";
  inputPreview: string;
  riskScore: number;
  riskLevel: string;
  category: string | null;
  summary: string;
  indicators: Array<{
    severity: string;
    category: string | null | undefined;
    title: string;
    description: string | null | undefined;
    evidence: string | null | undefined;
  }>;
}

export interface AiProvider {
  analyze(context: AiScanContext): Promise<AiAnalysisResult>;
}
