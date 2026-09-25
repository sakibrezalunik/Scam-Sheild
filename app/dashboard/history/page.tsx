import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, Clock, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";

interface PageProps {
  searchParams: Promise<{ page?: string; type?: string; riskLevel?: string }>;
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return notFound();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const limit = 10;
  const type = params.type || "";
  const riskLevel = params.riskLevel || "";

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId: user.id };
  if (type === "url") where.scanType = "url";
  else if (type === "message") where.scanType = "message";
  else if (type === "job") where.scanType = "job";
  if (riskLevel) where.riskLevel = riskLevel;

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      select: {
        id: true,
        scanType: true,
        inputPreview: true,
        riskScore: true,
        riskLevel: true,
        category: true,
        summary: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.scan.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative z-10">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/account" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Scan History</h1>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {total} scan{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <FilterChip href="/dashboard/history" active={!type} label="All" />
              <FilterChip href="/dashboard/history?type=url" active={type === "url"} label="URL Scans" />
              <FilterChip href="/dashboard/history?type=message" active={type === "message"} label="Message Scans" />
              <FilterChip href="/dashboard/history?type=job" active={type === "job"} label="Job Scans" />
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <FilterChip href="/dashboard/history?riskLevel=low" active={riskLevel === "low"} label="Low Risk" />
              <FilterChip href="/dashboard/history?riskLevel=moderate" active={riskLevel === "moderate"} label="Moderate Risk" />
              <FilterChip href="/dashboard/history?riskLevel=high" active={riskLevel === "high"} label="High Risk" />
              <FilterChip href="/dashboard/history?riskLevel=critical" active={riskLevel === "critical"} label="Critical" />
            </div>
            {(type || riskLevel) && (
              <Link
                href="/dashboard/history"
                className="ml-auto text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </Link>
            )}
          </div>
        </div>

        {/* Scan List */}
        {scans.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Shield className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {type || riskLevel ? "No scans match your filters." : "No scans yet. Start scanning to build your history."}
            </p>
            {!type && !riskLevel && (
              <Link
                href="/scan?type=url"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Scan Your First URL
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {scans.map((scan) => (
              <ScanRow key={scan.id} scan={scan} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <PaginationLink page={page - 1} current={page} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </PaginationLink>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="px-2 text-slate-400">…</span>
                  )}
                  <PaginationLink page={p} current={page}>
                    {p}
                  </PaginationLink>
                </React.Fragment>
              ))}
            <PaginationLink page={page + 1} current={page} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </PaginationLink>
          </div>
        )}
      </main>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      {label}
    </Link>
  );
}

function ScanRow({
  scan,
}: {
  scan: {
    id: string;
    scanType: string;
    inputPreview: string | null;
    riskScore: number | null;
    riskLevel: string | null;
    category: string | null;
    summary: string | null;
    createdAt: Date;
  };
}) {
  const riskLevel = (scan.riskLevel ?? "low").toUpperCase();
  const badgeCls: Record<string, string> = {
    MINIMAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    MODERATE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Link
      href={`/results/${scan.id}`}
      className="block p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${badgeCls[riskLevel] ?? "bg-slate-100 dark:bg-slate-800"}`}>
          <span className="text-sm font-bold">{scan.riskScore ?? "?"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {scan.scanType === "url" ? "URL" : scan.scanType === "job" ? "Job" : "Message"}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls[riskLevel] ?? ""}`}>
              {riskLevel.toLowerCase()}
            </span>
            {scan.category && (
              <span className="text-xs text-slate-500 dark:text-slate-500">
                {scan.category.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {scan.inputPreview ?? scan.id}
          </p>
          {scan.summary && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{scan.summary}</p>
          )}
          <div className="flex items-center gap-1 mt-1 text-xs text-slate-400 dark:text-slate-500">
            <Clock className="h-3 w-3" />
            <time dateTime={scan.createdAt.toISOString()}>
              {scan.createdAt.toLocaleString()}
            </time>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PaginationLink({
  children,
  page,
  current,
  disabled,
}: {
  children: React.ReactNode;
  page: number;
  current: number;
  disabled?: boolean;
}) {
  if (disabled) {
    return <span className="px-3 py-1.5 text-sm text-slate-300 dark:text-slate-600">{children}</span>;
  }
  const href = `/dashboard/history?page=${page}`;
  const isActive = page === current;
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
        isActive
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
      }`}
    >
      {children}
    </Link>
  );
}
