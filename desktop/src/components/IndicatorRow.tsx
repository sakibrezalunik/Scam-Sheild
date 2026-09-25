/**
 * ScamShield Desktop — Indicator Row Component
 */
import { AlertTriangle, CheckCircle, Info, ShieldCheck, XCircle } from "lucide-react";
import type { ScanIndicator } from "../types";

interface IndicatorRowProps {
  indicator: ScanIndicator;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: XCircle,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    text: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
    badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  high: {
    icon: AlertTriangle,
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-900",
    text: "text-orange-700 dark:text-orange-400",
    iconColor: "text-orange-500",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  },
  medium: {
    icon: Info,
    bg: "bg-yellow-50 dark:bg-yellow-950/30",
    border: "border-yellow-200 dark:border-yellow-900",
    text: "text-yellow-700 dark:text-yellow-400",
    iconColor: "text-yellow-500",
    badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
  },
  low: {
    icon: ShieldCheck,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-700 dark:text-blue-400",
    iconColor: "text-blue-500",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  positive: {
    icon: CheckCircle,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-900",
    text: "text-emerald-700 dark:text-emerald-400",
    iconColor: "text-emerald-500",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
};

export default function IndicatorRow({ indicator }: IndicatorRowProps) {
  const config = SEVERITY_CONFIG[indicator.severity] ?? SEVERITY_CONFIG.low;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${config.text}`}>{indicator.title}</span>
          {indicator.category && (
            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400">
              {indicator.category}
            </span>
          )}
        </div>
        {indicator.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {indicator.description}
          </p>
        )}
        {indicator.evidence && (
          <p className="mt-1 text-xs font-mono text-gray-500 dark:text-gray-500 bg-white/50 dark:bg-gray-800/50 rounded px-2 py-1">
            {indicator.evidence}
          </p>
        )}
      </div>
    </div>
  );
}
