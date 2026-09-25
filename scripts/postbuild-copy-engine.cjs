/**
 * Postbuild script: copies the Prisma Query Engine binary into .next/
 * so Vercel's serverless bundler includes it in the deployment.
 *
 * Next.js outputFileTracingIncludes is respected locally but Vercel's
 * bundler ignores it for files outside .next/. This script ensures the
 * Linux engine binary ends up inside .next/generated/prisma/ where
 * Prisma's process.cwd()-based lookup will find it.
 */
const { cpSync, existsSync, mkdirSync } = require("node:fs");
const { resolve, dirname } = require("node:path");

const root = resolve(__dirname, "..");
const src = resolve(root, "generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node");
const dstDir = resolve(root, ".next", "generated", "prisma");
const dst = resolve(dstDir, "libquery_engine-rhel-openssl-3.0.x.so.node");

if (!existsSync(src)) {
  console.error(`[postbuild] Missing source: ${src}`);
  process.exit(1);
}

mkdirSync(dstDir, { recursive: true });
cpSync(src, dst, { force: true });
console.log(`[postbuild] Copied Prisma Linux engine -> ${dst}`);
