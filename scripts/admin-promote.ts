/**
 * Admin promote script — promotes an existing user to admin role.
 *
 * Usage:
 *   npm run admin:promote -- user@example.com
 *
 * This script:
 * - Reads DATABASE_URL from environment (must be set)
 * - Looks up the user by email (case-insensitive)
 * - Sets role = "admin" on the User record
 * - Prints a confirmation (never prints the password)
 * - Exits with code 1 if the user is not found
 */

import { resolve } from "node:path";
import { config as dotenvConfig } from "dotenv";

// Load .env.local before any database module is imported.
// ESM import hoisting means `import { prisma }` would run BEFORE this call
// if placed after, so we load env first and use dynamic import below.
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: npm run admin:promote -- <email>");
  console.error("Example: npm run admin:promote -- admin@example.com");
  process.exit(1);
}

const email = args[0].toLowerCase().trim();
if (!email || !email.includes("@")) {
  console.error("Error: Please provide a valid email address.");
  process.exit(1);
}

async function main() {
  // Dynamic import ensures prisma is instantiated AFTER dotenv has loaded
  const { prisma } = await import("../lib/db");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    console.error(`Error: No user found with email "${email}".`);
    await prisma.$disconnect();
    process.exit(1);
  }

  if (user.role === "admin") {
    console.log(`User "${email}" is already an admin.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "admin" },
  });

  console.log(`✓ Promoted "${email}" (id: ${user.id}) to admin role.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error promoting user:", err);
  process.exit(1);
});
