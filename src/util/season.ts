import { fromZonedTime, toZonedTime } from "/opt/nodejs/date-fns";
import { DEFAULT_TIMEZONE } from "@/src/util/dateTime";

// Define when the season results are calculated
export const SEASON_TIMEZONE = DEFAULT_TIMEZONE;
export const SEASON_CUTOFF_HOUR = 13;
export const SEASON_CUTOFF_MINUTE = 40;

/**
 * Converts a year and a zero-based month into a season key.
 */
export const toSeasonKey = (year: number, monthIndex: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

/**
 * Converts a season key into that season's start and end timestamps
 * in the given timezone.
 */
export const toSeasonDateRange = (
  seasonKey: string,
  timezone = SEASON_TIMEZONE,
): {
  startDate: Date;
  endDate: Date;
} => {
  if (!isValidSeasonKey(seasonKey)) {
    throw new Error(`Invalid season key: ${seasonKey}`);
  }

  const [yearString, monthString] = seasonKey.split("-");
  const year = Number(yearString);
  const monthIndex = Number(monthString) - 1;

  return {
    startDate: fromZonedTime(
      new Date(year, monthIndex, 1, 0, 0, 0, 0),
      timezone,
    ),
    endDate: fromZonedTime(
      new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
      timezone,
    ),
  };
};

/**
 * Given a date, resolves the last "completed" season relative to that date.
 * When the date is amidst an ongoing season, uses the previous full season.
 */
export const getLastCompletedSeasonKey = (
  date: Date = new Date(),
  timezone = SEASON_TIMEZONE,
): string => {
  const zonedNow = toZonedTime(date, timezone);
  const lastDayOfMonth = new Date(
    zonedNow.getFullYear(),
    zonedNow.getMonth() + 1,
    0,
  ).getDate();

  const isLastDayOfMonth = zonedNow.getDate() === lastDayOfMonth;
  const isAtOrPastCutoff =
    zonedNow.getHours() > SEASON_CUTOFF_HOUR ||
    (zonedNow.getHours() === SEASON_CUTOFF_HOUR &&
      zonedNow.getMinutes() >= SEASON_CUTOFF_MINUTE);

  // The season which `date` targets has come to a close, but a new one hasn't
  // begun yet. Use the just ended season.
  if (isLastDayOfMonth && isAtOrPastCutoff) {
    return toSeasonKey(zonedNow.getFullYear(), zonedNow.getMonth());
  }

  // The season which `date` targets is ongoing. Use the previous full season.
  const previousMonthDate = new Date(
    zonedNow.getFullYear(),
    zonedNow.getMonth() - 1,
    1,
  );

  return toSeasonKey(
    previousMonthDate.getFullYear(),
    previousMonthDate.getMonth(),
  );
};

/**
 * Checks if a string is a valid "season key".
 * @see toSeasonKey
 */
export const isValidSeasonKey = (seasonKey: string): boolean =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(seasonKey);
