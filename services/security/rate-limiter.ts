/**
 * Rate limiter for scan creation endpoints.
 * Prevents scan-flooding abuse using an in-memory token bucket.
 * Unauthenticated requests are limited by IP; authenticated by user ID.
 * Resets on server restart (acceptable for this application).
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const REFILL_RATE = 6; // tokens per minute
const MAX_TOKENS = 10;
const REFILL_INTERVAL_MS = 60_000;

const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  headers?: Record<string, string>;
}

/**
 * Check if a scan creation is allowed for the given key.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key) ?? { tokens: MAX_TOKENS, lastRefill: now };

  const elapsed = now - entry.lastRefill;
  const refillTokens = Math.floor((elapsed / REFILL_INTERVAL_MS) * REFILL_RATE);
  if (refillTokens > 0) {
    entry.tokens = Math.min(MAX_TOKENS, entry.tokens + refillTokens);
    entry.lastRefill = now;
  }

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(MAX_TOKENS),
    "X-RateLimit-Remaining": String(entry.tokens),
    "X-RateLimit-Reset": String(Math.ceil((entry.lastRefill + REFILL_INTERVAL_MS) / 1000)),
  };

  if (entry.tokens <= 0) {
    const retryAfterMs = Math.ceil(
      ((1 - entry.tokens + MAX_TOKENS) / REFILL_RATE) * REFILL_INTERVAL_MS
    );
    buckets.set(key, entry);
    return { allowed: false, remaining: 0, retryAfterMs, headers };
  }

  entry.tokens -= 1;
  buckets.set(key, entry);
  return { allowed: true, remaining: entry.tokens, headers };
}

/**
 * Get the client IP from a NextRequest (handles proxies).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

/**
 * Reset rate limit for a key (useful for testing).
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
