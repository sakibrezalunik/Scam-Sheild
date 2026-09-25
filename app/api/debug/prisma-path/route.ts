import { NextResponse } from "next/server";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export async function GET() {
  const info: Record<string, unknown> = {};
  
  // Runtime paths Prisma checks
  const cwd = process.cwd();
  const paths = [
    join(cwd, "generated/prisma", "libquery_engine-rhel-openssl-3.0.x.so.node"),
    join(cwd, ".next/generated/prisma", "libquery_engine-rhel-openssl-3.0.x.so.node"),
    join(cwd, ".prisma/client", "libquery_engine-rhel-openssl-3.0.x.so.node"),
    "/tmp/prisma-engines/libquery_engine-rhel-openssl-3.0.x.so.node",
  ];
  
  for (const p of paths) {
    info[p] = {
      exists: existsSync(p),
      isFile: existsSync(p) ? statSync(p).isFile() : false,
      size: existsSync(p) ? statSync(p).size : 0,
    };
  }
  
  info["processCwd"] = cwd;
  info["nodeVersion"] = process.version;
  info["platform"] = process.platform;
  
  // Also try to connect to DB to see actual error
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    info["dbConnect"] = "OK";
  } catch (e: unknown) {
    const err = e as Error;
    info["dbConnect"] = err?.message || String(err);
  }
  
  return NextResponse.json(info);
}
