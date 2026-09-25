import { NextResponse } from "next/server";
import { logout } from "@/lib/auth/signup-login";
import { getSessionToken } from "@/lib/auth/middleware";

export async function POST() {
  try {
    const token = await getSessionToken();
    if (token) {
      await logout(token);
    }
    return NextResponse.json({ success: true });
  } catch {
    // Always clear the cookie even if server-side cleanup fails
    return NextResponse.json({ success: true });
  }
}
