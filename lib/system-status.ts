import { db, safeQuery } from "@/lib/db";

/**
 * Determines the live threshold in milliseconds.
 * On weekends (Sat/Sun) the agent doesn't trade, so we extend to 48 h
 * to avoid false "offline" signals after a quiet Friday evening.
 */
function getLiveThresholdMs(): number {
  const day = new Date().getDay(); // 0 = Sun, 6 = Sat
  const isWeekend = day === 0 || day === 6;
  return (isWeekend ? 48 : 24) * 60 * 60 * 1000;
}

/**
 * Returns the most recent write activity across knowledge_base and strategies.
 * KB uses `updatedAt`; strategy uses `createdAt` and `deletedAt` (supersedes).
 */
export async function checkIsLive(): Promise<{ live: boolean; lastActivityAt: Date | null }> {
  const [lastKb, lastStrategyCreated, lastStrategyDeleted] = await Promise.all([
    safeQuery(() =>
      db.knowledgeBase.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      })
    ),
    safeQuery(() =>
      db.strategy.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      })
    ),
    safeQuery(() =>
      db.strategy.findFirst({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        select: { deletedAt: true },
      })
    ),
  ]);

  const candidates: Date[] = [
    lastKb.data?.updatedAt,
    lastStrategyCreated.data?.createdAt,
    lastStrategyDeleted.data?.deletedAt ?? undefined,
  ].filter((d): d is Date => d instanceof Date);

  if (candidates.length === 0) {
    return { live: false, lastActivityAt: null };
  }

  const lastActivityAt = new Date(Math.max(...candidates.map((d) => d.getTime())));
  const live = Date.now() - lastActivityAt.getTime() < getLiveThresholdMs();

  return { live, lastActivityAt };
}
