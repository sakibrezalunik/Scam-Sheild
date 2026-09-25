import { Loader2 } from "lucide-react";

export default function ResultsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-500 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Loading analysis results…</p>
      </div>
    </div>
  );
}
