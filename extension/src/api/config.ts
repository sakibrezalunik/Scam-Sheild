/**
 * ScamShield Extension — Configuration
 *
 * Set SCAMSHIELD_API_BASE to point at your local or production backend.
 *
 * Local development:   http://localhost:3000
 * Production:          https://scamshield.app
 *
 * NOTE: Anything here is public — it runs in the user's browser.
 * Never store API keys, secrets, or credentials in this file.
 */

// Use Vite's define config to inject the API base at build time.
// Default to localhost for local dev; override via env var or build flag.
export const DEFAULT_API_BASE: string =
  typeof process !== 'undefined' && process.env?.SCAMSHIELD_API_BASE
    ? process.env.SCAMSHIELD_API_BASE
    : 'http://localhost:3000';

// Request timeout in milliseconds
export const REQUEST_TIMEOUT_MS = 15_000;

// Retry delay on rate-limit (seconds)
export const RATE_LIMIT_RETRY_SECONDS = 60;
