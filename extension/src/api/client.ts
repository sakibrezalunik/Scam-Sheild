/**
 * ScamShield Extension — API Client
 *
 * Calls the existing ScamShield backend URL scan endpoint.
 * Does NOT implement any scanning logic — purely a transport layer.
 *
 * API calls are made from the background service worker (not the popup)
 * to avoid CSP restrictions. The popup sends messages via
 * chrome.runtime.sendMessage; the background script calls this client.
 */

import type { ApiResult, ScanResult } from "../types";
import { DEFAULT_API_BASE, REQUEST_TIMEOUT_MS } from "./config";

const SCAN_ENDPOINT = `${DEFAULT_API_BASE}/api/scans/url`;

// ─── Timeout helper (uses AbortSignal internally) ──────────────────────

// ─── Validate URL string before sending ─────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export function validateExtensionUrl(input: string): ValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "URL is empty" };
  }

  let url: string;
  try {
    url = new URL(trimmed).toString();
  } catch {
    // Try prepending https://
    try {
      url = new URL(`https://${trimmed}`).toString();
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }
  }

  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: `Protocol "${parsed.protocol.slice(0, -1)}" is not supported` };
  }

  // Reject very long URLs (backend limit is 2048 chars)
  if (url.length > 2048) {
    return { valid: false, error: "URL is too long" };
  }

  return { valid: true, normalizedUrl: url };
}

// ─── Check if a URL is a browser-internal page ──────────────────────────
export function isInternalPage(url: string): boolean {
  const protocols = [
    "chrome:",
    "chrome-extension:",
    "edge:",
    "about:",
    "file:",
    "devtools:",
    "moz-extension:",
    "safari-extension:",
  ];
  try {
    const parsed = new URL(url);
    return protocols.some((p) => parsed.protocol === p);
  } catch {
    return false;
  }
}

// ─── Main scan function ─────────────────────────────────────────────────
export async function scanUrl(
  url: string
): Promise<ApiResult<ScanResult>> {
  const validation = validateExtensionUrl(url);
  if (!validation.valid) {
    return {
      success: false,
      error: { message: validation.error ?? "Unknown error" },
    };
  }

  const normalizedUrl = validation.normalizedUrl!;

  let response: Response;
  try {
    response = await fetch(SCAN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { success: false, error: { message: "Scan timed out. The website may be slow or unreachable." } };
    }
    return { success: false, error: { message: "Network error. Check your connection and try again." } };
  }

  // Rate limited
  if (response.status === 429) {
    return { success: false, error: { code: "RATE_LIMITED", message: "Too many scans. Please wait a moment and try again." } };
  }

  // Auth required (shouldn't happen for guest scans, but handle gracefully)
  if (response.status === 401) {
    return { success: false, error: { code: "AUTH_REQUIRED", message: "Authentication required. Please log in to the ScamShield website first." } };
  }

  let body: ApiResult<ScanResult>;
  try {
    body = await response.json();
  } catch {
    return { success: false, error: { message: "Invalid response from server." } };
  }

  if (!body.success) {
    return body; // forward the error as-is
  }

  // Validate the returned data shape minimally
  const data = body.data;
  if (
    typeof data?.riskScore !== "number" ||
    typeof data?.riskLevel !== "string" ||
    typeof data?.id !== "string"
  ) {
    return { success: false, error: { message: "Unexpected response format from server." } };
  }

  return body;
}
