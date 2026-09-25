import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const [total, urlCount, msgCount, jobCount] = await Promise.all([
    prisma.scan.count({ where: { userId: user.id } }),
    prisma.scan.count({ where: { userId: user.id, scanType: "url" } }),
    prisma.scan.count({ where: { userId: user.id, scanType: "message" } }),
    prisma.scan.count({ where: { userId: user.id, scanType: "job" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: { total, urlCount, msgCount, jobCount },
  });
}
