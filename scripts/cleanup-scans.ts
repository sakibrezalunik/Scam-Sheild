/**
 * Data retention cleanup script.
 *
 * Deletes scans older than SCAN_RETENTION_DAYS (30) along with their
 * related records. Safe to run repeatedly (idempotent).
 *
 * Usage:
 *   npx tsx scripts/cleanup-scans.ts           # dry-run (default)
 *   npx tsx scripts/cleanup-scans.ts --delete  # actually delete
 */

import { prisma } from "../lib/db";
import { SCAN_RETENTION_DAYS } from "../lib/utils/constants";
import { logger } from "../lib/logger";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--delete");

  logger.info("Cleanup started", { dryRun, retentionDays: SCAN_RETENTION_DAYS });

  const cutoffDate = new Date(Date.now() - SCAN_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  logger.info("Cutoff date", { cutoffDate: cutoffDate.toISOString() });

  // Count old scans
  const oldCount = await prisma.scan.count({
    where: { createdAt: { lt: cutoffDate } },
  });
  logger.info("Scans to process", { count: oldCount, dryRun });

  if (oldCount === 0) {
    logger.info("Nothing to clean up");
    return;
  }

  if (dryRun) {
    logger.info("Dry-run mode — no deletions performed. Pass --delete to apply.");
    return;
  }

  // Delete related records first (without cascade to be explicit)
  const scanIds = await prisma.scan.findMany({
    where: { createdAt: { lt: cutoffDate } },
    select: { id: true },
  });

  const ids = scanIds.map((s) => s.id);

  // Delete in order: child tables first, then scans
  await prisma.riskIndicator.deleteMany({ where: { scanId: { in: ids } } });
  await prisma.urlAnalysis.deleteMany({ where: { scanId: { in: ids } } });
  await prisma.messageAnalysis.deleteMany({ where: { scanId: { in: ids } } });
  await prisma.jobAnalysis.deleteMany({ where: { scanId: { in: ids } } });
  await prisma.aiAnalysis.deleteMany({ where: { scanId: { in: ids } } });
  const deleted = await prisma.scan.deleteMany({ where: { createdAt: { lt: cutoffDate } } });

  logger.info("Cleanup complete", { deleted: deleted.count });
}

main().catch((err) => {
  logger.error("Cleanup failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
