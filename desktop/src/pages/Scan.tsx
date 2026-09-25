/**
 * ScamShield Desktop — Scan Page
 *
 * Handles URL, Message, and Job scanning. Routes to Results on completion.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "../hooks/useNavigate";
import { useAuth } from "../store/auth";
import { scanUrl, scanMessage, scanJob } from "../api/client";
import { addScanToHistory } from "../store/storage";
import type { ScanResult, ScanType } from "../types";
import ScanForm from "../components/ScanForm";

export default function ScanPage() {
  const { navigate } = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);

  // Handle initial scan type
  const [activeType] = useState<ScanType>("url");

  const handleScan = async (input: string, type: ScanType) => {
    setError(null);
    setIsLoading(true);
    setCurrentResult(null);

    let result: ScanResult | null = null;

    try {
      if (type === "url") {
        const res = await scanUrl(input);
        if (res.success && res.data) result = res.data;
        else setError((res as { success: false; error: { message: string } }).error.message ?? "Scan failed");
      } else if (type === "message") {
        const res = await scanMessage(input);
        if (res.success && res.data) result = res.data;
        else setError((res as { success: false; error: { message: string } }).error.message ?? "Scan failed");
      } else {
        const res = await scanJob(input);
        if (res.success && res.data) result = res.data;
        else setError((res as { success: false; error: { message: string } }).error.message ?? "Scan failed");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }

    if (result) {
      // Cache locally
      addScanToHistory({
        id: result.id,
        scanType: result.scanType,
        inputPreview: result.inputPreview,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        category: result.category,
        summary: result.summary,
        createdAt: result.createdAt,
      });
      setCurrentResult(result);
      // Navigate to results
      navigate({ kind: "results", id: result.id });
    }
  };

  // Handle quota exceeded / auth required
  useEffect(() => {
    // Show auth gate if needed
  }, [isAuthenticated]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analyze</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Enter a URL, message, or job posting to detect potential scams.
        </p>
      </div>

      {currentResult ? (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Analysis complete —{" "}
            <button
              onClick={() => navigate({ kind: "results", id: currentResult.id })}
              className="underline font-medium"
            >
              View full results
            </button>
          </p>
        </div>
      ) : null}

      <ScanForm
        onSubmit={handleScan}
        isLoading={isLoading}
        error={error}
        scanType={activeType}
      />

      {/* Quota / Auth info */}
      {!isAuthenticated && (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            Sign in for higher quotas and scan history.{" "}
            <button
              onClick={() => navigate({ kind: "login" })}
              className="underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
