/**
 * ScamShield Desktop — Local Storage Keys
 */
export const STORAGE_KEYS = {
  SCAN_HISTORY: "scamshield_scan_history",
  THEME: "scamshield_theme",
  API_BASE: "scamshield_api_base",
} as const;

// ─── Scan History ──────────────────────────────────────────────────────

import type { ScanHistoryItem } from "../types";

export function getScanHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCAN_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanHistoryItem[];
    // Sanity check: each item must have an id and createdAt
    return parsed.filter(
      (item) => item && typeof item.id === "string" && typeof item.createdAt === "string"
    );
  } catch {
    return [];
  }
}

export function addScanToHistory(scan: ScanHistoryItem): void {
  try {
    const history = getScanHistory();
    // Remove duplicate if already present
    const filtered = history.filter((item) => item.id !== scan.id);
    // Add to front, keep max 50
    filtered.unshift(scan);
    const trimmed = filtered.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function removeScanFromHistory(id: string): void {
  try {
    const history = getScanHistory().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCAN_HISTORY, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function clearScanHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SCAN_HISTORY);
  } catch {
    // ignore
  }
}

// ─── Theme ─────────────────────────────────────────────────────────────

export function getTheme(): "light" | "dark" | "system" {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // ignore
  }
  return "system";
}

export function setTheme(theme: "light" | "dark" | "system"): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch {
    // ignore
  }
}

// ─── API Base Override ─────────────────────────────────────────────────

export function getApiBase(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.API_BASE) ?? "";
  } catch {
    return "";
  }
}

export function setApiBase(url: string): void {
  try {
    if (url) {
      localStorage.setItem(STORAGE_KEYS.API_BASE, url);
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_BASE);
    }
  } catch {
    // ignore
  }
}
