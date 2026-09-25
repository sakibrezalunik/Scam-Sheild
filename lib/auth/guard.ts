import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/middleware";

/**
 * API route helper: returns 401 if no authenticated user,
 * or continues with the user attached to the request.
 */
export async function authGuard() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required" } },
      { status: 401 }
    );
  }
  return { user };
}
