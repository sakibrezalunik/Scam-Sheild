import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/services/security/input-validator";
import { login } from "@/lib/auth/signup-login";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: result.error.issues[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }

    const authResult = await login({
      email: result.data.email,
      password: result.data.password,
    });

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: { message: authResult.error } },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, message: "Login successful" });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "An error occurred. Please try again." } },
      { status: 500 }
    );
  }
}
