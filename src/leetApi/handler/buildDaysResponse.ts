import type { LeetDay } from "@/src/leetDays/types";
import type { LeetDaysResponse } from "../types";
import { encodeDaysCursor } from "./daysCursor";

/**
 * Builds the response body for the leet days endpoint from the leet days.
 *
 * `nextCursor` is the last returned date, even when nothing more is waiting,
 * so the client can resume later. With no new days, `after` is echoed back.
 * `timezone` tells the client which calendar the `date` fields belong to.
 */
export const buildDaysResponse = ({
  guildId,
  timezone,
  days,
  hasMore,
  after,
}: {
  guildId: string;
  timezone: string;
  days: LeetDay[];
  hasMore: boolean;
  after?: string;
}): LeetDaysResponse => {
  const lastDate = days.length > 0 ? days[days.length - 1].date : after;

  return {
    guildId,
    timezone,
    days,
    nextCursor: lastDate ? encodeDaysCursor(lastDate) : null,
    hasMore,
  };
};
