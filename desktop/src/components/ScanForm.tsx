/**
 * ScamShield Desktop — Scan Form Component
 *
 * Reusable form with URL/Message/Job tab switching.
 */
import { useState } from "react";
import { Globe, MessageSquare, Briefcase } from "lucide-react";
import type { ScanType } from "../types";

interface ScanFormProps {
  onSubmit: (input: string, type: ScanType) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  scanType?: "url" | "message" | "job";
}

export default function ScanForm({ onSubmit, isLoading, error, scanType = "url" }: ScanFormProps) {
  const [activeTab, setActiveTab] = useState<"url" | "message" | "job">(scanType);
  const [input, setInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!input.trim()) {
      setFormError(getEmptyError(activeTab));
      return;
    }

    await onSubmit(input, activeTab);
    setInput("");
  };

  const getEmptyError = (type: string) => {
    switch (type) {
      case "url":
        return "Please enter a URL to analyze";
      case "message":
        return "Please enter a message to analyze";
      case "job":
        return "Please paste a job posting to analyze";
      default:
        return "Please enter input to analyze";
    }
  };

  const tabs = [
    { key: "url" as const, label: "URL", icon: Globe },
    { key: "message" as const, label: "Message", icon: MessageSquare },
    { key: "job" as const, label: "Job Offer", icon: Briefcase },
  ];

  const placeholder =
    activeTab === "url"
      ? "https://suspicious-site.example.com"
      : activeTab === "message"
      ? "Paste the message or email content here..."
      : "Paste the job posting or offer details here...";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setFormError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        {activeTab === "url" ? (
          <div className="relative">
            <input
              type="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            rows={activeTab === "job" ? 10 : 6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-y"
          />
        )}

        {/* Character count */}
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-400">
            {input.length} chars
          </span>
        </div>

        {/* Error display */}
        {(formError || error) && (
          <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
            {formError || error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Analyze
            </>
          )}
        </button>
      </form>

      {/* Quick info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 pt-2">
        {activeTab === "url" && (
          <p>Paste any web address to check for phishing, fraud, or malicious activity.</p>
        )}
        {activeTab === "message" && (
          <p>Paste an email, SMS, or social media message to analyze for scam indicators.</p>
        )}
        {activeTab === "job" && (
          <p>Paste a job posting or offer to verify legitimacy and spot employment scams.</p>
        )}
      </div>
    </div>
  );
}
