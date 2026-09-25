import OpenAI from "openai";
import type {
  AiProvider,
  AiProviderConfig,
  AiAnalysisResult,
  AiScanContext,
} from "./ai-provider";

/**
 * OpenAI provider implementing the AiProvider interface.
 * Uses GPT-4o-mini for cost-effective analysis.
 */
export class OpenAiProvider implements AiProvider {
  private client: OpenAI;
  private model: string;
  private timeoutMs: number;

  constructor(config: AiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: config.timeoutMs ?? 8000,
    });
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 8000;
  }

  async analyze(context: AiScanContext): Promise<AiAnalysisResult> {
    const prompt = buildPrompt(context);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: AI_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1024,
        temperature: 0.1,
      });

      const raw = response.choices[0]?.message?.content ?? "{}";
      const parsed = parseAiOutput(raw);

      return {
        assessment: parsed.assessment ?? "AI analysis unavailable",
        confidence: Math.min(100, Math.max(0, parsed.confidence ?? 50)),
        reasoning: parsed.reasoning ?? "",
        additionalInsights: Array.isArray(parsed.additionalInsights)
          ? parsed.additionalInsights.filter(Boolean)
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter(Boolean)
          : [],
        status: "success",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown AI error";
      return {
        assessment: "AI analysis unavailable",
        confidence: 0,
        reasoning: "",
        additionalInsights: [],
        recommendations: [],
        status: "error",
        error: message,
      };
    }
  }
}

// ─── Prompt Construction ────────────────────────────────────────

function buildPrompt(context: AiScanContext): string {
  const indicators = context.indicators
    .filter((ind) => ind.severity !== "positive")
    .map(
      (ind) =>
        `- [${ind.severity}] ${ind.title}: ${ind.description ?? ""}${
          ind.evidence ? ` (Evidence: ${ind.evidence})` : ""
        }`
    )
    .join("\n");

  const signalSummary = `
The deterministic security engine has already analyzed this target and produced the following structured signals:

- Deterministic Risk Score: ${context.riskScore}/100
- Risk Level: ${context.riskLevel.toUpperCase()}
- Category: ${context.category ?? "uncategorized"}
- Total Indicators: ${context.indicators.length}
`;

  return `${signalSummary}
Security Indicators Detected:
${indicators || "  (No suspicious indicators from deterministic analysis)"}

Context:
- Type: ${context.scanType}
- Preview: ${context.inputPreview}
- Summary: ${context.summary}

Please provide your AI-assisted assessment in JSON format with these fields:
- assessment: A brief overall assessment (1-2 sentences)
- confidence: A number 0-100 representing how confident you are in this assessment
- reasoning: Why you agree or disagree with the deterministic analysis, noting any patterns a human analyst would catch
- additionalInsights: Array of 0-3 additional observations not captured by deterministic rules
- recommendations: Array of 0-3 practical safety recommendations
`.trim();
}

const AI_SYSTEM_PROMPT = `You are a senior cybersecurity analyst specializing in scam detection, phishing, and social engineering. You review structured security signals produced by an automated analysis engine and provide expert context, nuance, and pattern recognition that complements rule-based detection.

Your job is to:
1. Review the deterministic signals provided
2. Add expert-level insight where the automated analysis may be missing nuance
3. Flag anything that looks like a sophisticated or novel attack pattern
4. Provide practical, actionable advice

Always respond in valid JSON. Never output markdown code fences. Keep responses concise and focused on security relevance.`;

// ─── JSON Parsing ────────────────────────────────────────────────

interface RawAiOutput {
  assessment?: string;
  confidence?: number;
  reasoning?: string;
  additionalInsights?: unknown;
  recommendations?: unknown;
}

function parseAiOutput(raw: string): RawAiOutput {
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    return JSON.parse(cleaned) as RawAiOutput;
  } catch {
    return {};
  }
}
