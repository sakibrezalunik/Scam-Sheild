import { notFound } from "next/navigation";
import Link from "next/link";
import { Shield, ArrowRight, Clock, Link as LinkIcon, MessageSquare, Briefcase, Plus } from "lucide-react";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return notFound();

  // Fetch stats
  const [total, urlCount, msgCount, jobCount] = await Promise.all([
    prisma.scan.count({ where: { userId: user.id } }),
    prisma.scan.count({ where: { userId: user.id, scanType: "url" } }),
    prisma.scan.count({ where: { userId: user.id, scanType: "message" } }),
    prisma.scan.count({ where: { userId: user.id, scanType: "job" } }),
  ]);

  // Fetch recent scans (last 5)
  const recentScans = await prisma.scan.findMany({
    where: { userId: user.id },
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
    take: 5,
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative z-10">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/history"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 rounded"
            >
              History
            </Link>
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 rounded"
              >
                Admin
              </Link>
            )}
            <Link
              href="/account"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 rounded"
            >
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user.name || user.email.split("@")[0]}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Here&apos;s an overview of your scanning activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Scans"
            value={total}
            icon={Shield}
            color="blue"
            href="/dashboard/history"
          />
          <StatCard
            title="URL Scans"
            value={urlCount}
            icon={LinkIcon}
            color="emerald"
            href="/dashboard/history?type=url"
          />
          <StatCard
            title="Message Scans"
            value={msgCount}
            icon={MessageSquare}
            color="amber"
            href="/dashboard/history?type=message"
          />
          <StatCard
            title="Job Scans"
            value={jobCount}
            icon={Briefcase}
            color="purple"
            href="/dashboard/history?type=job"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/scan?type=url"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Scan a URL
            </Link>
            <Link
              href="/scan?type=message"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Scan a Message
            </Link>
            <Link
              href="/scan?type=job"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Scan a Job
            </Link>
            <Link
              href="/dashboard/history"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              View Full History
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Scans</h2>
            <Link
              href="/dashboard/history"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentScans.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">No scans yet. Start by scanning a URL or message.</p>
              <Link
                href="/scan?type=url"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Scan Your First URL
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <ScanRow key={scan.id} scan={scan} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  href: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
  };
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <Link href={href} className={`block rounded-xl border ${c.border} ${c.bg} p-6 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className={`h-6 w-6 ${c.text}`} />
      </div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{title}</p>
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
      className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${badgeCls[riskLevel] ?? "bg-slate-100 dark:bg-slate-800"}`}>
        <span className="text-xs font-bold">{scan.riskScore ?? "?"}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {scan.scanType === "url" ? "URL" : scan.scanType === "job" ? "Job" : "Message"}
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
        <p className="text-xs text-slate-500 dark:text-slate-500 flex items-center gap-1 mt-0.5">
          <Clock className="h-3 w-3" />
          {new Date(scan.createdAt).toLocaleDateString()}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
    </Link>
  );
}
