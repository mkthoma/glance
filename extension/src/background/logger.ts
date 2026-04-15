import { MAX_ERROR_LOG_ENTRIES } from "../shared/constants";
import { getUsageStats, updateUsageStats } from "../shared/storage";
import type { LoggedError } from "../shared/types";

function getWeekBucket(timestamp: number): string {
  const date = new Date(timestamp);
  const weekStart = new Date(date);
  weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

export async function logExtensionError(
  error: Omit<LoggedError, "ts"> & { ts?: number }
): Promise<void> {
  await updateUsageStats((stats) => {
    const nextErrors = [
      {
        ts: error.ts ?? Date.now(),
        code: error.code,
        message: error.message,
        context: error.context
      },
      ...stats.errors
    ].slice(0, MAX_ERROR_LOG_ENTRIES);

    return {
      ...stats,
      errors: nextErrors
    };
  });
}

export async function recordBriefingUsage(inputCharacters: number): Promise<void> {
  await updateUsageStats((stats) => {
    const currentBucket = getWeekBucket(Date.now());
    const sameWeek = stats.weekBucket === currentBucket;

    return {
      ...stats,
      totalBriefings: stats.totalBriefings + 1,
      weekBriefings: sameWeek ? stats.weekBriefings + 1 : 1,
      weekBucket: currentBucket,
      totalInputCharacters: stats.totalInputCharacters + inputCharacters
    };
  });
}

export async function getLoggedErrors(): Promise<LoggedError[]> {
  const stats = await getUsageStats();
  return stats.errors;
}
