"use client";

import { useState } from "react";
import { ChevronDown, Settings } from "lucide-react";

interface ScanData {
  id: string;
  scanType: string;
  inputPreview: string;
  riskScore: number;
  riskLevel: string;
  category: string | null;
  summary: string;
  recommendations: string[];
  indicators: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    evidence: string | null;
  }>;
  urlAnalysis: {
    url: string;
    domain: string;
    isHttps: boolean | null;
    httpStatus: number | null;
    redirectCount: number | null;
    hasLoginForm: boolean | null;
    hasPaymentForm: boolean | null;
    securityHeaders: Record<string, boolean | string | null> | null;
    redirectChain: string[];
  } | null;
  messageAnalysis: {
    messageType: string | null;
    detectedUrls: string[] | null;
    detectedPhones: string[] | null;
    detectedEmails: string[] | null;
    language: string | null;
  } | null;
  jobAnalysis: {
    companyName: string | null;
    jobTitle: string | null;
    recruiterName: string | null;
    salaryRange: string | null;
    redFlags: unknown[] | null;
    positiveSignals: unknown[] | null;
  } | null;
  createdAt: Date | string;
}

export function TechnicalDetails({ scan }: { scan: ScanData }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left"
      >
        <span className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-500" />
          Technical Details
        </span>
        <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(scan, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
