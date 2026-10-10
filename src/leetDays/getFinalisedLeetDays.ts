import { getLatestFinalisedDate } from "@/src/util/finalisedDays";
import { getLeetDaysInRange } from "./getLeetDaysInRange";
import type { LeetDays } from "./types";

/**
 * Reads the finalised leet days of a guild: those whose 13:40 cutoff has
 * passed at `now` in `timezone` (the same cutoff the season results use).
 * Read-only. Does not check that the guild exists.
 *
 * `fromDate` is the first guild-local date to include (YYYY-MM-DD). See
 * `getLeetDaysInRange` for how `fromDate`, `limit` and `timezone` behave.
 */
export const getFinalisedLeetDays = async ({
  tableName,
  guildId,
  timezone,
  fromDate,
  limit,
  now,
}: {
  tableName: string;
  guildId: string;
  timezone: string;
  fromDate?: string;
  limit?: number;
  now: Date;
}): Promise<LeetDays> =>
  getLeetDaysInRange({
    tableName,
    guildId,
    timezone,
    fromDate,
    toDate: getLatestFinalisedDate(now, timezone),
    limit,
  });
