/**
 * Notes for the developer.
 *
 * Unix timestamps like `1697262436284` do not contain any locale information.
 * Dates created from such values will be in the server's timezone (?).
 */
import { toZonedTime, format, fromZonedTime } from "/opt/nodejs/date-fns";

export { toZonedTime };

const DEFAULT_TIMEZONE = "Europe/Helsinki";

/**
 * Converts any date representation into a Date object
 */
export const toDateObject = (dateInput: number | string | Date) => {
  if (!(dateInput instanceof Date)) {
    return new Date(dateInput);
  }
  return dateInput;
};

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
  const date = toDateObject(dateInput);
  return toZonedTime(date, timezone);
};

/**
 * Creates a new date at the desired time in a given timezone
 * @param dateInput Date to create a copy of
 * @param timezone Target timezone
 * @param options Target hours, minutes, seconds, and milliseconds
 */
export const setZonedTime = (
  dateInput: number | string | Date,
  timezone = DEFAULT_TIMEZONE,
  options: { hours: number; minutes: number; seconds: number; ms: number },
): Date => {
  const date = toDateObject(dateInput);
  const zonedDate = toZonedTime(date, timezone);

  const y = zonedDate.getFullYear();
  const m = zonedDate.getMonth();
  const d = zonedDate.getDate();

  return fromZonedTime(
    new Date(
      y,
      m,
      d,
      options.hours,
      options.minutes,
      options.seconds,
      options.ms,
    ),
    timezone,
  );
};

/**
 * Creates a new date with the hours and minutes set to 13:37 in the given timezone.
 * @param originalDate Date to change
 * @param timezone Target timezone
 * @returns New date object, leaving the original as-is.
 */
export const setTimeToLeet = (
  originalDate: string,
  timezone?: string,
): Date => {
  const date = toDateObject(originalDate);
  return setZonedTime(originalDate, timezone, {
    hours: 13,
    minutes: 13,
    seconds: date.getSeconds(),
    ms: date.getMilliseconds(),
  });
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
