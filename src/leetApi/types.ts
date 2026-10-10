import type { LeetDay } from "@/src/leetDays/types";

export interface LeetDaysResponse {
  guildId: string;
  // IANA timezone name that the `date` of each day is a guild-local date in
  timezone: string;
  days: LeetDay[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Validated query for the leet days endpoint.
 */
export interface LeetDaysQuery {
  // Last date the caller has already seen (decoded from the cursor)
  after?: string;
  // Earliest date to include (inclusive)
  since?: string;
  limit: number;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };
