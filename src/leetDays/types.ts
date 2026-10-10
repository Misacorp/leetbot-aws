/**
 * One player's successful leet on a given day.
 */
export interface LeetDayParticipant {
  userId: string;
  // ISO-8601 timestamp (UTC) of the player's earliest leet that day
  leetAt: string;
}

/**
 * A guild-local calendar date with at least one leet.
 */
export interface LeetDay {
  // `<guildId>:<YYYY-MM-DD>`
  id: string;
  // Guild-local calendar date, YYYY-MM-DD, in the timezone of the query
  date: string;
  participants: LeetDayParticipant[];
}

/**
 * Leet days in ascending date order. `hasMore` is true when more days exist
 * in the requested range after the last returned one.
 */
export interface LeetDays {
  days: LeetDay[];
  hasMore: boolean;
}
