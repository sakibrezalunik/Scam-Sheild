/**
 * Postbuild script: copies the Prisma Query Engine binary into .next/
 * and patches the Next.js Turbopack bundles so Prisma searches the
 * correct runtime path on Vercel Lambda.
 *
 * On Vercel, NFT traces the binary to /var/task/generated/prisma/, but
 * the bundled Prisma client hardcodes /ROOT/generated/prisma/ (derived
 * from the asset resolver's ABSOLUTE_ROOT). This script fixes both.
 */
const { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } = require("node:fs");
const { resolve, join } = require("node:path");

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

// Patch SSR chunks: replace hardcoded /ROOT/generated/prisma with
// the actual Vercel Lambda path where NFT placed the binary.
const nextServerChunks = resolve(root, ".next", "server", "chunks");
let patchedFiles = 0;
let patchedReplacements = 0;

function patchDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      patchDir(full);
    } else if (entry.name.endsWith(".js") && !entry.name.endsWith(".map.js")) {
      let content = readFileSync(full, "utf8");
      const before = content;
      content = content.split("/ROOT/generated/prisma").join("/var/task/generated/prisma");
      if (content !== before) {
        writeFileSync(full, content, "utf8");
        const count = (before.match(/\/ROOT\/generated\/prisma/g) || []).length;
        patchedReplacements += count;
        patchedFiles++;
        console.log(`[postbuild] Patched ${entry.name} (${count} replacements)`);
      }
    }
  }
}

patchDir(nextServerChunks);
console.log(`[postbuild] Patched ${patchedFiles} file(s), ${patchedReplacements} replacement(s)`);
