import { NextRequest, NextResponse } from "next/server";
import { signupSchema } from "@/services/security/input-validator";
import { signup } from "@/lib/auth/signup-login";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { message: result.error.issues[0]?.message || "Invalid input" } },
        { status: 400 }
      );
    }

    const authResult = await signup({
      email: result.data.email,
      password: result.data.password,
      name: result.data.name,
    });

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: { message: authResult.error } },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, message: "Account created successfully" });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: "An error occurred. Please try again." } },
      { status: 500 }
    );
  }
}
