import crypto from "node:crypto";

/**
 * Generate a cryptographically secure session token.
 * Server-only — not safe for Edge Runtime.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString("hex");
}
