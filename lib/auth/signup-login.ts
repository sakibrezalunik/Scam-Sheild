import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword, hashSessionToken } from "./password";
import { generateSessionToken } from "./token";
import { setSessionCookie, clearSessionCookie } from "./session";

export interface SignupInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Register a new user and create an authenticated session.
 */
export async function signup(input: SignupInput): Promise<AuthResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    // Generic error to avoid account enumeration
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase().trim(),
      name: input.name?.trim() || null,
      passwordHash,
    },
  });

  await createSession(user.id);
  return { success: true, userId: user.id };
}

/**
 * Authenticate a user by email + password and create a session.
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase().trim() } });
  if (!user || !user.passwordHash) {
    return { success: false, error: "Invalid email or password." };
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid email or password." };
  }

  await createSession(user.id);
  return { success: true, userId: user.id };
}

/**
 * Sign out the current session by token.
 */
export async function logout(token: string): Promise<void> {
  await invalidateSession(token);
}

/**
 * Create a new session for a user, set the cookie, and return the token.
 */
async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const tokenHash = hashSessionToken(token);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  await setSessionCookie(token);
  return token;
}

/**
 * Invalidate a session by token hash.
 */
async function invalidateSession(token: string): Promise<void> {
  const tokenHash = hashSessionToken(token);
  await prisma.session.deleteMany({ where: { tokenHash } });
  await clearSessionCookie();
}
