import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "scamshield_session";

/**
 * Read the raw session token from cookies.
 * Safe to call in Edge Runtime (middleware) — no database access, no crypto.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Set the session cookie with secure attributes.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const isProd = process.env.NODE_ENV === "production";
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

/**
 * Clear the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    expires: new Date(0),
  });
}
