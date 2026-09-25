import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowLeft, Users, FileText, Link as LinkIcon, MessageSquare, Briefcase, Crown, TrendingUp } from "lucide-react";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/middleware";

interface StatsData {
  totalUsers: number;
  totalScans: number;
  urlScans: number;
  messageScans: number;
  jobScans: number;
  adminUsers: number;
  recent24hScans: number;
  riskDistribution: {
    minimal: number;
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
}

async function fetchStats(): Promise<StatsData> {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/admin/stats`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch admin stats");
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? "Unknown error");
  return json.data;
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) return notFound();
  if (user.role !== "admin") {
    // Return a proper 403 experience for non-admin users
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You do not have permission to access the admin panel.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  let stats: StatsData;
  try {
    stats = await fetchStats();
  } catch {
    stats = {
      totalUsers: 0,
      totalScans: 0,
      urlScans: 0,
      messageScans: 0,
      jobScans: 0,
      adminUsers: 0,
      recent24hScans: 0,
      riskDistribution: { minimal: 0, low: 0, moderate: 0, high: 0, critical: 0 },
    };
  }

  const { totalUsers, totalScans, urlScans, messageScans, jobScans, adminUsers, recent24hScans, riskDistribution } = stats;

  const cards = [
    {
      title: "Total Users",
      value: totalUsers,
      icon: Users,
      color: "blue",
      href: null,
    },
    {
      title: "Total Scans",
      value: totalScans,
      icon: FileText,
      color: "emerald",
      href: null,
    },
    {
      title: "URL Scans",
      value: urlScans,
      icon: LinkIcon,
      color: "amber",
      href: null,
    },
    {
      title: "Message Scans",
      value: messageScans,
      icon: MessageSquare,
      color: "purple",
      href: null,
    },
    {
      title: "Job Scans",
      value: jobScans,
      icon: Briefcase,
      color: "rose",
      href: null,
    },
    {
      title: "Admin Users",
      value: adminUsers,
      icon: Crown,
      color: "orange",
      href: null,
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-600 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-600 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
    purple: { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-600 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
    rose: { bg: "bg-rose-50 dark:bg-rose-950/20", text: "text-rose-600 dark:text-rose-400", border: "border-rose-200 dark:border-rose-800" },
    orange: { bg: "bg-orange-50 dark:bg-orange-950/20", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
  };

  const riskColors: Record<string, string> = {
    minimal: "bg-emerald-500",
    low: "bg-green-500",
    moderate: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  const maxRisk = Math.max(riskDistribution.minimal, riskDistribution.low, riskDistribution.moderate, riskDistribution.high, riskDistribution.critical, 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative z-10">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
            </Link>
            <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800">
              ADMIN
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Overview</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Platform statistics and scan activity summary.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {cards.map((card) => {
            const c = colorMap[card.color] ?? colorMap.blue;
            return (
              <div
                key={card.title}
                className={`rounded-xl border ${c.border} ${c.bg} p-5`}
              >
                <div className="flex items-center justify-between mb-3">
                  <card.icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{card.title}</p>
              </div>
            );
          })}
        </div>

        {/* Two-column layout: recent activity + risk distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="space-y-3">
              <StatRow label="Total Scans" value={totalScans} total={totalScans} />
              <StatRow label="URL Scans" value={urlScans} total={totalScans} />
              <StatRow label="Message Scans" value={messageScans} total={totalScans} />
              <StatRow label="Job Scans" value={jobScans} total={totalScans} />
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3">
                <StatRow label="Scans (Last 24h)" value={recent24hScans} total={totalScans} accent />
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <StatRow label="Registered Users" value={totalUsers} total={totalUsers} />
                <StatRow label="Admin Users" value={adminUsers} total={totalUsers} />
              </div>
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Risk Distribution</h2>
            </div>
            <div className="space-y-4">
              {(["critical", "high", "moderate", "low", "minimal"] as const).map((level) => {
                const count = riskDistribution[level];
                const pct = totalScans > 0 ? Math.round((count / totalScans) * 100) : 0;
                const barWidth = maxRisk > 0 ? Math.round((count / maxRisk) * 100) : 0;
                const labelMap: Record<string, string> = {
                  minimal: "Minimal",
                  low: "Low",
                  moderate: "Moderate",
                  high: "High",
                  critical: "Critical",
                };
                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{labelMap[level]}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {count} <span className="text-slate-400 dark:text-slate-500">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${riskColors[level]}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatRow({
  label,
  value,
  total,
  accent = false,
}: {
  label: string;
  value: number;
  total: number;
  accent?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${accent ? "font-semibold text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${accent ? "bg-blue-500" : "bg-slate-400 dark:bg-slate-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-medium text-slate-900 dark:text-white tabular-nums min-w-[3ch] text-right">
          {value}
        </span>
      </div>
    </div>
  );
}
