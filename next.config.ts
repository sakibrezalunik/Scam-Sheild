import type { NextConfig } from "next";

// Webpack 5 does not recognize "node:" prefixed builtins as externals.
// Next.js adds bare builtin names (e.g. "crypto") to externals, but imports
// like "node:crypto" fail with UnhandledSchemeError. Add the prefixed variants
// so webpack treats them as external Node.js modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeBuiltins = require("module").builtinModules;

const nextConfig: NextConfig = {
  // Silence the Turbopack+webpack mixed-config warning in Next.js 16.
  turbopack: {},

  // Force Next.js NFT (Node File Trace) to include the Prisma Query Engine
  // binary in serverless deployment bundles. The generated Prisma client loads
  // the native .so/.dll via runtime fs.readFileSync(path.join(...)), which is
  // not statically analyzable by NFT. Without this, the binary is excluded from
  // Vercel serverless functions, causing:
  //   "Prisma Client could not locate the Query Engine for runtime ..."
  outputFileTracingIncludes: {
    "/api/*": ["generated/prisma"],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      const nodePrefixed = nodeBuiltins.map((m: string) => `node:${m}`);

      // Add node: prefixed builtins to externals array.
      // Must come BEFORE any object-style entries so they resolve first.
      const existing = config.externals || [];
      const newEntries: (string | Record<string, string>)[] = [];

      for (const m of nodePrefixed) {
        newEntries.push(`commonjs ${m.slice("node:".length)}`);
      }

      // Preserve existing entries (strings and objects)
      if (Array.isArray(existing)) {
        config.externals = [...newEntries, ...existing];
      } else if (typeof existing === "function") {
        // Wrap existing function to handle node: prefixed builtins first
        const original = existing;
        config.externals = (
          args: { request?: string; import?: string },
          callback: (err?: Error | null, req?: string) => void
        ) => {
          const req = args.request ?? args.import;
          if (typeof req === "string" && nodePrefixed.includes(req)) {
            return callback(null, `commonjs ${req.slice("node:".length)}`);
          }
          return original(args, callback);
        };
      }
    }
    return config;
  },
};

export default nextConfig;
