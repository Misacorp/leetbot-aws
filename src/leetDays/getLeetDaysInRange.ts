import { MessageTypes } from "@/src/types";
import { paginateGuildMessages } from "@/src/repository/message/getGuildMessages";
import { addCalendarDays } from "@/src/util/calendarDates";
import { getDayStartInstant } from "@/src/util/finalisedDays";
import { collectLeetDays } from "./collectLeetDays";
import { resolveDateRange } from "./resolveDateRange";
import type { LeetDays } from "./types";

/**
 * Reads the leet days of a guild within a range of guild-local dates.
 * Read-only. Does not check that the guild exists.
 *
 * `fromDate` and `toDate` are guild-local dates (YYYY-MM-DD, both inclusive)
 * in `timezone` (an IANA name). Without `fromDate` reading starts at the
 * beginning, without `toDate` it has no end, and without `limit` every day is
 * returned. Days come oldest first. Reading from the database stops as soon
 * as `limit` days are collected and one more is seen.
 */
export const getLeetDaysInRange = async ({
  tableName,
  guildId,
  timezone,
  fromDate,
  toDate,
  limit,
}: {
  tableName: string;
  guildId: string;
  timezone: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<LeetDays> => {
  const range = resolveDateRange(fromDate, toDate);

  if (!range) {
    return { days: [], hasMore: false };
  }

  return collectLeetDays({
    messages: paginateGuildMessages({
      tableName,
      guildId,
      type: MessageTypes.LEET,
      from: getDayStartInstant(range.fromDate, timezone).toISOString(),
      to:
        range.toDate === undefined
          ? undefined
          : getEndOfDayInstant(range.toDate, timezone).toISOString(),
    }),
    guildId,
    fromDate: range.fromDate,
    toDate: range.toDate,
    limit,
    timezone,
  });
};

/**
 * The last millisecond of a guild-local date in the timezone.
 */
const getEndOfDayInstant = (date: string, timezone: string): Date =>
  new Date(
    getDayStartInstant(addCalendarDays(date, 1), timezone).getTime() - 1,
  );
