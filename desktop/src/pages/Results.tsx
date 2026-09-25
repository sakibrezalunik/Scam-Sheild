/**
 * ScamShield Desktop — Results Page
 */
import { useState, useEffect } from "react";
import { ExternalLink, RefreshCw, Bot } from "lucide-react";
import { useNavigate } from "../hooks/useNavigate";
import { getScan } from "../api/client";
import RiskGauge from "../components/RiskGauge";
import IndicatorRow from "../components/IndicatorRow";
import type { ScanResult } from "../types";

export default function ResultsPage({ id }: { id: string }) {
  const { navigate } = useNavigate();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  const loadScan = () => {
    let cancelled = false;
    getScan(id).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(
          (res as { success: false; error: { message: string } }).error?.message ?? "Failed to load scan result"
        );
      }
    }).catch(() => {
      if (!cancelled) setError("Network error. Could not load the scan result.");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  };

  useEffect(() => {
    const cancel = loadScan();
    return cancel;
    // loadScan is stable since it only captures id which is in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <svg className="animate-spin w-8 h-8 text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <p className="text-sm text-red-700 dark:text-red-400">{error ?? "Result not found"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadScan()} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => navigate({ kind: "home" })} className="text-sm text-gray-600 dark:text-gray-400">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analysis Results</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate({ kind: "scan" })}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            New Scan
          </button>
          <a
            href={`https://scamshield.app/results/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ExternalLink className="w-4 h-4" />
            Full Analysis
          </a>
        </div>
      </div>

      {/* Risk Score Card */}
      <div className="p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <RiskGauge result={result} size="lg" />
          <div className="flex-1 text-center sm:text-left space-y-2">
            {result.category && (
              <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {result.category}
              </span>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {result.summary ?? "Analysis complete"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Input: <span className="font-mono text-xs">{result.inputPreview ?? "—"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Indicators */}
      {result.indicators.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Indicators</h3>
          <div className="space-y-2">
            {result.indicators.map((ind) => (
              <IndicatorRow key={ind.id} indicator={ind} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-400">Recommendations</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
            {result.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Supplemental Analysis */}
      {result.aiAnalysis && (
        <div className="p-4 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h3 className="font-semibold text-violet-800 dark:text-violet-400">AI Supplemental Analysis</h3>
            <span className="text-xs text-violet-500 dark:text-violet-500">
              {result.aiAnalysis.provider} · {result.aiAnalysis.model}
            </span>
          </div>
          <p className="text-sm text-violet-700 dark:text-violet-400 leading-relaxed">
            {result.aiAnalysis.assessment}
          </p>
          {result.aiAnalysis.reasoning && (
            <details className="text-sm text-violet-700 dark:text-violet-400">
              <summary className="cursor-pointer font-medium">Show reasoning</summary>
              <p className="mt-2 leading-relaxed">{result.aiAnalysis.reasoning}</p>
            </details>
          )}
          {result.aiAnalysis.additionalIndicators.length > 0 && (
            <div>
              <p className="font-medium text-sm mb-1">Additional Indicators:</p>
              <div className="flex flex-wrap gap-1">
                {result.aiAnalysis.additionalIndicators.map((ind, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-full bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-400"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Technical Details */}
      <details open={showTechnical} onToggle={(e) => setShowTechnical((e.target as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          Technical Details
        </summary>
        <div className="mt-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-600 dark:text-gray-400 space-y-3 overflow-auto max-h-96">
          {result.scanType === "url" && result.urlAnalysis && (
            <div>
              <p className="font-semibold mb-1">URL Analysis</p>
              <pre className="whitespace-pre-wrap">{JSON.stringify(result.urlAnalysis, null, 2)}</pre>
            </div>
          )}
          {result.scanType === "message" && result.msgAnalysis && (
            <div>
              <p className="font-semibold mb-1">Message Analysis</p>
              <pre className="whitespace-pre-wrap">{JSON.stringify(result.msgAnalysis, null, 2)}</pre>
            </div>
          )}
          {result.scanType === "job" && result.jobAnalysis && (
            <div>
              <p className="font-semibold mb-1">Job Analysis</p>
              <pre className="whitespace-pre-wrap">{JSON.stringify(result.jobAnalysis, null, 2)}</pre>
            </div>
          )}
          <div>
            <p className="font-semibold mb-1">Raw Result</p>
            <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      </details>
    </div>
  );
}
