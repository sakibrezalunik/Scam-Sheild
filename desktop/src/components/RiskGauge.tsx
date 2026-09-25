/**
 * ScamShield Desktop — Risk Gauge Component
 *
 * Displays a circular gauge for the risk score with color coding.
 */
import type { ScanResult } from "../types";

interface RiskGaugeProps {
  result: ScanResult;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: { gauge: "w-16 h-16", score: "text-xl", label: "text-xs" },
  md: { gauge: "w-24 h-24", score: "text-2xl", label: "text-sm" },
  lg: { gauge: "w-32 h-32", score: "text-3xl", label: "text-base" },
};

export default function RiskGauge({ result, size = "lg" }: RiskGaugeProps) {
  const score = result.riskScore ?? 0;
  const level = result.riskLevel ?? "unknown";
  const { gauge, score: scoreClass, label } = SIZE_CLASSES[size];

  const getStrokeColor = () => {
    switch (level) {
      case "minimal":
      case "low":
        return "#10b981";
      case "moderate":
        return "#eab308";
      case "high":
        return "#f97316";
      case "critical":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const getLabel = () => {
    switch (level) {
      case "minimal":
        return "Minimal";
      case "low":
        return "Low";
      case "moderate":
        return "Moderate";
      case "high":
        return "High";
      case "critical":
        return "Critical";
      default:
        return "Unknown";
    }
  };

  const circumference = 2 * Math.PI * 45; // r=45
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const strokeColor = getStrokeColor();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative ${gauge}`}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${scoreClass} font-bold`} style={{ color: strokeColor }}>{score}</span>
          <span className={label} style={{ color: strokeColor }}>{getLabel()}</span>
        </div>
      </div>
    </div>
  );
}
