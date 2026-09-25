"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Link as LinkIcon, MessageSquare, Briefcase, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { PredictiveArcBackground } from "@/components/scanner/PredictiveArcBackground";

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "url";

  const [scanType, setScanType] = useState(initialType);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!input.trim()) {
      setError("Please enter a URL, message, or job offer to analyze");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let endpoint: string;
      let body: Record<string, string>;
      if (scanType === "url") {
        endpoint = "/api/scans/url";
        body = { url: input };
      } else if (scanType === "message") {
        endpoint = "/api/scans/message";
        body = { message: input };
      } else {
        endpoint = "/api/scans/job";
        body = { jobDescription: input };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setIsRedirecting(true);
        router.push(`/results/${data.data.id}`);
      } else {
        setError(data.error?.message || "An error occurred during analysis");
        setIsLoading(false);
      }
    } catch {
      setError("Failed to connect to the server. Please try again.");
      setIsLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (scanType) {
      case "url":
        return "https://example.com or example.com";
      case "message":
        return "Paste a suspicious message, email, or text here...";
      case "job":
        return "Paste the full job posting, offer letter, or recruiter message...";
      default:
        return "Enter content to analyze...";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ThreeUI RibbonField WebGL Background */}
      <PredictiveArcBackground />

      {/* Scanner UI — sits above the background */}
      <div className="relative z-10">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur-md sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="text-sm text-slate-300 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Analyze Suspicious Content
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Paste a URL, message, or job description to get a detailed risk assessment
            </p>
          </div>

          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardContent className="p-6">
              <Tabs value={scanType} onValueChange={setScanType} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="url" className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Website / URL</span>
                    <span className="sm:hidden">URL</span>
                  </TabsTrigger>
                  <TabsTrigger value="message" className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Message</span>
                    <span className="sm:hidden">Message</span>
                  </TabsTrigger>
                  <TabsTrigger value="job" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden sm:inline">Job Offer</span>
                    <span className="sm:hidden">Job</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4">
                  <div>
                    <label
                      htmlFor="url-input"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      Enter a URL to analyze
                    </label>
                    <input
                      id="url-input"
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={getPlaceholder()}
                      className="w-full h-12 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                      disabled={isLoading || isRedirecting}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="message" className="space-y-4">
                  <div>
                    <label
                      htmlFor="message-input"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      Paste the message to analyze
                    </label>
                    <textarea
                      id="message-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={getPlaceholder()}
                      rows={6}
                      maxLength={10000}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                      disabled={isLoading || isRedirecting}
                    />
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-600 text-right">
                      {input.length}/10,000 characters
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="job" className="space-y-4">
                  <div>
                    <label
                      htmlFor="job-input"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      Paste a job posting or recruiter message to analyze
                    </label>
                    <textarea
                      id="job-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={getPlaceholder()}
                      rows={10}
                      maxLength={10000}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-shadow"
                      disabled={isLoading || isRedirecting}
                    />
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Paste the full job posting or recruiter message. We&apos;ll check for advance-fee requests, unrealistic claims, impersonation, and more.
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-600 flex-shrink-0 ml-4">
                        {input.length}/10,000 characters
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <Button
                onClick={handleScan}
                disabled={isLoading || isRedirecting || !input.trim()}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {(isLoading || isRedirecting) ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {isRedirecting ? "Redirecting to results…" : "Analyzing…"}
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6 leading-relaxed">
            ScamShield uses deterministic security rules plus optional AI analysis for deeper insights.
            Deterministic scoring is always primary — AI results supplement but never override it.
            This tool provides risk assessments only; always use your own judgment and verify through official channels.
          </p>
        </div>
      </main>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
