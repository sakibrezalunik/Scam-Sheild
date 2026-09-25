import { prisma } from "@/lib/db";
import { hashSessionToken } from "./password";
import { clearSessionCookie } from "./session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "scamshield_session";

/**
 * Read the raw session token from cookies (for server-side use).
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Verify a session token against the database and return the user.
 * Returns null if the session is invalid or expired.
 */
export async function getSessionUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!session || !session.user) return null;
  return session.user;
}

/**
 * Get the current authenticated user, or null if not logged in.
 * Safe to call in both server components and server actions.
 */
export async function getCurrentUser() {
  return getSessionUser();
}

/**
 * Require an authenticated user, returning null if not authenticated.
 * This is the preferred pattern for API routes and server components.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  return user;
}

/**
 * Require an authenticated admin user.
 * Returns the admin user object when authorized.
 * Returns a 403 NextResponse when the user is not an admin.
 * Use this in API routes: const admin = await requireAdmin(); if ("status" in admin) return admin;
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: { message: "Admin access required" } },
      { status: 403 }
    );
  }
  return user;
}

/**
 * Invalidate the current session (used on logout).
 */
export async function signOut() {
  const token = await getSessionToken();
  if (token) {
    const tokenHash = hashSessionToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  clearSessionCookie();
}
