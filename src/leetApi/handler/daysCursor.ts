import { isValidCalendarDate } from "@/src/util/calendarDates";

const MAX_CURSOR_LENGTH = 64;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Encodes the last returned date into an opaque cursor.
 */
export const encodeDaysCursor = (date: string): string =>
  Buffer.from(JSON.stringify({ d: date }), "utf8").toString("base64url");

/**
 * Decodes a cursor into the date it points at.
 * Returns null when the cursor is not exactly what `encodeDaysCursor` makes.
 */
export const decodeDaysCursor = (cursor: string): string | null => {
  if (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH) {
    return null;
  }
  if (!BASE64URL_PATTERN.test(cursor)) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const keys = Object.keys(parsed);
    const date = (parsed as Record<string, unknown>).d;
    if (keys.length !== 1 || typeof date !== "string") {
      return null;
    }
    if (!isValidCalendarDate(date)) {
      return null;
    }

    // Reject non-canonical encodings, such as stray padding bits.
    return encodeDaysCursor(date) === cursor ? date : null;
  } catch {
    return null;
  }
};
