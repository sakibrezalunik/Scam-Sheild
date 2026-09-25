/**
 * Rate limiter for AI analysis calls.
 * Prevents excessive AI API usage per IP/user.
 * Uses an in-memory token bucket (resets on server restart).
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const REFILL_RATE = 3; // tokens per minute
const MAX_TOKENS = 5;
const REFILL_INTERVAL_MS = 60_000;

const buckets = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

/**
 * Check if an AI call is allowed for the given key.
 */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key) ?? { tokens: MAX_TOKENS, lastRefill: now };

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill;
  const refillTokens = Math.floor((elapsed / REFILL_INTERVAL_MS) * REFILL_RATE);
  if (refillTokens > 0) {
    entry.tokens = Math.min(MAX_TOKENS, entry.tokens + refillTokens);
    entry.lastRefill = now;
  }

  if (entry.tokens <= 0) {
    const retryAfterMs = Math.ceil(
      ((1 - entry.tokens + MAX_TOKENS) / REFILL_RATE) * REFILL_INTERVAL_MS
    );
    buckets.set(key, entry);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.tokens -= 1;
  buckets.set(key, entry);
  return { allowed: true, remaining: entry.tokens };
}

/**
 * Reset rate limit for a key (useful for testing).
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
