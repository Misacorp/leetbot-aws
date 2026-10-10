import { addCalendarDays } from "@/src/util/calendarDates";
import type { LeetDaysQuery } from "../types";

/**
 * Turns the validated query into the arguments the service understands.
 * The service knows nothing about cursors: "resume after the cursor date" and
 * `since` both become one `startDate`, the later of the two.
 */
export const createServiceInput = (
  query: LeetDaysQuery,
): { startDate?: string; limit: number } => {
  const candidates: string[] = [];
  if (query.since) {
    candidates.push(query.since);
  }
  if (query.after) {
    candidates.push(addCalendarDays(query.after, 1));
  }

  const startDate =
    candidates.length > 0
      ? candidates.sort()[candidates.length - 1]
      : undefined;

  return { startDate, limit: query.limit };
};
