import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
          <Shield className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">Scan Not Found</p>
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
          The scan results you&apos;re looking for don&apos;t exist or have been removed.
        </p>
        <Link
          href="/scan"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          New Scan
        </Link>
      </div>
    </div>
  );
}
