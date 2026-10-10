import type { LeetDay, LeetDaysResponse } from "../types";
import { encodeDaysCursor } from "./daysCursor";

/**
 * Builds the response body for the leet days endpoint.
 *
 * `nextCursor` is the last returned date, even when nothing more is waiting,
 * so the client can resume later. With no new days, `after` is echoed back.
 */
export const buildDaysResponse = ({
  guildId,
  days,
  hasMore,
  after,
}: {
  guildId: string;
  days: LeetDay[];
  hasMore: boolean;
  after?: string;
}): LeetDaysResponse => {
  const lastDate = days.length > 0 ? days[days.length - 1].date : after;

  return {
    guildId,
    days,
    nextCursor: lastDate ? encodeDaysCursor(lastDate) : null,
    hasMore,
  };
};
