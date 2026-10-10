/**
 * One player's successful leet on a given day.
 */
export interface LeetDayParticipant {
  userId: string;
  // ISO-8601 timestamp (UTC) of the player's earliest leet that day
  leetAt: string;
}

/**
 * A finalised leet day: a Helsinki calendar date with at least one leet.
 */
export interface LeetDay {
  // `<guildId>:<YYYY-MM-DD>`
  id: string;
  // Helsinki calendar date, YYYY-MM-DD
  date: string;
  participants: LeetDayParticipant[];
}

export interface LeetDaysResponse {
  guildId: string;
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
