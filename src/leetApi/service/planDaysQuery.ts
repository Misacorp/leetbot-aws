import type { LeetDaysQuery } from "../types";
import { addCalendarDays } from "./calendarDates";

// Earlier than any real leet
const EARLIEST_DATE = "2000-01-01";

/**
 * Works out which Helsinki dates a query needs to read.
 * Returns null when the range is empty.
 */
export const planDaysQuery = (
  query: Pick<LeetDaysQuery, "after" | "since">,
  latestFinalisedDate: string,
): { startDate: string; lastDate: string } | null => {
  const candidates: string[] = [];
  if (query.since) {
    candidates.push(query.since);
  }
  if (query.after) {
    candidates.push(addCalendarDays(query.after, 1));
  }

  const startDate =
    candidates.length > 0
      ? [...candidates].sort()[candidates.length - 1]
      : EARLIEST_DATE;

  return startDate > latestFinalisedDate
    ? null
    : { startDate, lastDate: latestFinalisedDate };
};
