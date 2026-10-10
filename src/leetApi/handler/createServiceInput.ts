import { addCalendarDays } from "@/src/util/calendarDates";
import type { LeetDaysQuery } from "../types";

/**
 * Turns the validated query into the arguments the leet days service
 * understands. The service knows nothing about cursors: "resume after the
 * cursor date" and `since` both become one `fromDate`, the later of the two.
 */
export const createServiceInput = (
  query: LeetDaysQuery,
): { fromDate?: string; limit: number } => {
  const candidates: string[] = [];
  if (query.since) {
    candidates.push(query.since);
  }
  if (query.after) {
    candidates.push(addCalendarDays(query.after, 1));
  }

  const fromDate =
    candidates.length > 0
      ? candidates.sort()[candidates.length - 1]
      : undefined;

  return { fromDate, limit: query.limit };
};
