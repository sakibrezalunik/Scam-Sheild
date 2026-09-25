// Max input lengths (must match backend lib/utils/constants.ts)
export const MAX_INPUT_LENGTHS = {
  URL: 2048,
  MESSAGE: 10000,
  JOB: 10000,
} as const;

// Risk level thresholds (must match backend)
export const RISK_LEVELS = {
  MINIMAL: { min: 0, max: 19, label: "Minimal Risk", color: "emerald" },
  LOW: { min: 20, max: 39, label: "Low Risk", color: "green" },
  MODERATE: { min: 40, max: 59, label: "Moderate Risk", color: "yellow" },
  HIGH: { min: 60, max: 79, label: "High Risk", color: "orange" },
  CRITICAL: { min: 80, max: 100, label: "Critical Risk", color: "red" },
} as const;

export type RiskLevel = "minimal" | "low" | "moderate" | "high" | "critical";

export const SCAN_TYPES = {
  URL: "url",
  MESSAGE: "message",
  JOB: "job",
} as const;
