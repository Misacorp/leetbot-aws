import type { LeetDaysQuery, ValidationResult } from "../types";
import { isValidCalendarDate } from "./calendarDates";
import { decodeDaysCursor } from "./daysCursor";

export const DEFAULT_DAYS_LIMIT = 31;
export const MAX_DAYS_LIMIT = 100;

const ALLOWED_QUERY_KEYS = new Set(["after", "since", "limit"]);
const GUILD_ID_PATTERN = /^\d{17,20}$/;
const LIMIT_PATTERN = /^[1-9]\d{0,2}$/;

/**
 * Checks that a guild id looks like a Discord snowflake.
 */
export const isValidGuildId = (
  guildId: string | undefined,
): guildId is string => guildId !== undefined && GUILD_ID_PATTERN.test(guildId);

/**
 * Validates the query string of the leet days endpoint.
 * Messages are static on purpose: they never echo caller input.
 */
export const validateDaysQuery = (
  params: Record<string, string | undefined> | null | undefined,
): ValidationResult<LeetDaysQuery> => {
  const entries = Object.entries(params ?? {});

  if (entries.some(([key]) => !ALLOWED_QUERY_KEYS.has(key))) {
    return { ok: false, message: "Unknown query parameter" };
  }

  const query: LeetDaysQuery = { limit: DEFAULT_DAYS_LIMIT };

  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }

    if (key === "after") {
      const date = decodeDaysCursor(value);
      if (date === null) {
        return { ok: false, message: "after is not a valid cursor" };
      }
      query.after = date;
    } else if (key === "since") {
      if (!isValidCalendarDate(value)) {
        return { ok: false, message: "since must be a date as YYYY-MM-DD" };
      }
      query.since = value;
    } else if (key === "limit") {
      const limit = Number(value);
      if (!LIMIT_PATTERN.test(value) || limit < 1 || limit > MAX_DAYS_LIMIT) {
        return {
          ok: false,
          message: `limit must be an integer from 1 to ${MAX_DAYS_LIMIT}`,
        };
      }
      query.limit = limit;
    }
  }

  return { ok: true, value: query };
};
