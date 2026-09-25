/**
 * ScamShield Desktop — API Client
 *
 * All scanning, auth, and dashboard calls go through the existing
 * ScamShield Next.js API. No local scanning logic.
 */

import type {
  ApiResult,
  ScanResult,
  User,
  DashboardStats,
} from "../types";
import { setApiBase } from "../store/storage";

// ─── Configuration ─────────────────────────────────────────────────────

const FALLBACK_API_BASE = "http://localhost:3000";

/**
 * Resolve the API base URL with this priority:
 *   1. User-configured override from localStorage (Settings page)
 *   2. Build-time VITE_API_BASE (set in .env.production)
 *   3. Production default
 *
 * Empty or whitespace-only stored values are ignored.
 * Trailing slashes are normalized.
 */
function resolveApiBase(): string {
  try {
    const stored = localStorage.getItem("scamshield_api_base");
    if (stored?.trim()) return stored.trim().replace(/\/+$/, "");
  } catch {
    // localStorage unavailable — fall through
  }

  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase?.trim()) return envBase.trim().replace(/\/+$/, "");

  return "https://scamshield.app";
}

/**
 * Detect a reachable API base by health-checking the resolved base.
 * Falls back to localhost:3000 if the configured base is unreachable.
 * The result is cached in localStorage as "scamshield_api_base" so
 * subsequent launches skip the health check.
 */
async function detectApiBase(): Promise<string> {
  const configured = resolveApiBase();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    const resp = await fetch(`${configured}/api/health`, {
      method: "GET",
      credentials: "omit",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      if (data?.status === "ok") {
        // Cache the working base so future launches use it directly
        setApiBase(configured);
        return configured;
      }
    }
  } catch {
    // Health check failed — fall through to fallback
  }

  // Production API unreachable; use local dev server
  setApiBase(FALLBACK_API_BASE);
  return FALLBACK_API_BASE;
}

let _apiBase: string | null = null;

/** Returns the current API base, resolving lazily on first call. */
export async function getApiBase(): Promise<string> {
  if (_apiBase !== null) return _apiBase;
  _apiBase = await detectApiBase();
  return _apiBase;
}

/**
 * Invalidate the in-memory API base cache.
 * Call this after the user changes the API base in Settings
 * so subsequent requests use the new value immediately.
 */
export function resetApiBaseCache(): void {
  _apiBase = null;
}

const REQUEST_TIMEOUT_MS = 30_000;

// ─── Helpers ───────────────────────────────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const base = await getApiBase();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${base}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      signal: controller.signal,
      credentials: "include",
    });
    clearTimeout(timeout);

    let body: ApiResult<T>;
    try {
      body = await response.json();
    } catch {
      return {
        success: false,
        error: { message: "Invalid response from server." },
      };
    }

    // Translate HTTP errors into our API error format
    if (!body.success) {
      return body;
    }

    if (response.status === 401) {
      return {
        success: false,
        error: { message: "Authentication required. Please log in." },
      };
    }

    if (response.status === 429) {
      const errBody = body as unknown as { success: false; error?: { message?: string; code?: string; limit?: number; used?: number; resetAt?: string } };
      return {
        success: false,
        error: {
          message: errBody.error?.message ?? "Too many requests. Please wait and try again.",
          code: errBody.error?.code,
          limit: errBody.error?.limit,
          used: errBody.error?.used,
          resetAt: errBody.error?.resetAt,
        },
      };
    }

    return body;
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        success: false,
        error: { message: "Request timed out. The server may be slow." },
      };
    }
    return {
      success: false,
      error: { message: "Network error. Check your connection and try again." },
    };
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<ApiResult<{ userId: string }>> {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(
  email: string,
  password: string,
  name?: string
): Promise<ApiResult<{ userId: string }>> {
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function logout(): Promise<void> {
  const base = await getApiBase();
  await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function getMe(): Promise<ApiResult<User>> {
  return request("/api/auth/me");
}

// ─── Scans ─────────────────────────────────────────────────────────────

export async function scanUrl(
  url: string
): Promise<ApiResult<ScanResult>> {
  return request("/api/scans/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function scanMessage(
  message: string,
  messageType?: string
): Promise<ApiResult<ScanResult>> {
  return request("/api/scans/message", {
    method: "POST",
    body: JSON.stringify({ message, messageType }),
  });
}

export async function scanJob(
  jobDescription: string
): Promise<ApiResult<ScanResult>> {
  return request("/api/scans/job", {
    method: "POST",
    body: JSON.stringify({ jobDescription }),
  });
}

export async function getScan(id: string): Promise<ApiResult<ScanResult>> {
  return request(`/api/scans/${id}`);
}

// ─── Dashboard ─────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<ApiResult<DashboardStats>> {
  return request("/api/dashboard/stats");
}

// ─── Health ────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  const base = await getApiBase();
  try {
    const response = await fetch(`${base}/api/health`, {
      method: "GET",
      credentials: "omit",
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}
