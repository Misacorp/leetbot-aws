/**
 * Notes for the developer.
 *
 * Unix timestamps like `1697262436284` do not contain any locale information.
 * Dates created from such values will be in the server's timezone (?).
 */
import { toZonedTime, format } from "/opt/nodejs/date-fns";

export { toZonedTime };

const DEFAULT_TIMEZONE = "Europe/Helsinki";

/**
 * Determines if a message was created within the time window of [13:37, 13:38[
 * @param epoch    Timestamp as a unix epoch
 * @param timezone Target timezone
 */
export const isLeet = (epoch: number, timezone = DEFAULT_TIMEZONE) => {
  const createdAt: Date = toZonedTime(new Date(epoch), timezone);

  return createdAt.getHours() === 13 && createdAt.getMinutes() === 37;
};

/**
 * Determines if a message was created within the time window of [13:38, 13:39[
 * @param epoch    Timestamp as a unix epoch
 * @param timezone Target timezone
 */
export const isLeeb = (epoch: number, timezone = DEFAULT_TIMEZONE) => {
  const createdAt: Date = toZonedTime(new Date(epoch), timezone);

  return createdAt.getHours() === 13 && createdAt.getMinutes() === 38;
};

/**
 * Helper function to convert date input to a timezone-adjusted Date object
 * @param dateInput - Unix epoch (number), ISO string, or Date object
 * @param timezone - Target timezone
 * @returns Timezone-adjusted Date object
 */
const getZonedDate = (
  dateInput: number | string | Date,
  timezone = DEFAULT_TIMEZONE,
): Date => {
  let date: Date;

  if (!(dateInput instanceof Date)) {
    date = new Date(dateInput);
  } else {
    date = dateInput;
  }

  return toZonedTime(date, timezone);
};

/**
 * Converts various date formats to a date prefix (YYYY-MM-DD format)
 * @param dateInput - Unix epoch (number), ISO string, or Date object
 * @param timezone - Target timezone
 * @returns Date prefix in YYYY-MM-DD format
 */
export const getDatePrefix = (
  dateInput: number | string | Date,
  timezone = DEFAULT_TIMEZONE,
): string => {
  const zonedDate = getZonedDate(dateInput, timezone);
  return format(zonedDate, "yyyy-MM-dd");
};

/**
 * Converts various date formats to an ISO-8601 timestamp at the end of the day (23:59:59)
 * @param dateInput - Unix epoch (number), ISO string, or Date object
 * @param timezone - Target timezone
 * @returns ISO-8601 timestamp at the end of day (YYYY-MM-DDTHH:mm:ss format, no timezone designator)
 */
export const getEndOfDayPrefix = (
  dateInput: number | string | Date,
  timezone = DEFAULT_TIMEZONE,
): string => {
  const zonedDate = getZonedDate(dateInput, timezone);
  return format(zonedDate, "yyyy-MM-dd") + "T23:59:59";
};
