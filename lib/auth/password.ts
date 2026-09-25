import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Deterministic hash for session tokens.
 * Uses SHA-256 so the same input always produces the same output,
 * enabling equality checks against stored hashes in the database.
 * (Bcrypt is avoided here because its random salt makes identical
 * inputs produce different hash strings on each call.)
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
