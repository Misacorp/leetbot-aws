/**
 * Notes for the developer.
 *
 * Unix timestamps like `1697262436284` do not contain any locale information.
 * Dates created from such values will be in the server's timezone (?).
 */
import { utcToZonedTime } from "/opt/nodejs/date-fns";

export { utcToZonedTime };

const DEFAULT_TIMEZONE = "Europe/Helsinki";

/**
 * Converts a time to a unix epoch
 * @param date Date
 */
export const toEpoch = (date: Date) => Math.floor(date.getTime() / 1000);

/**
 * Determines if a message was created within the time window of [13:37, 13:38[
 * @param timestamp Timestamp as a unix epoch
 * @param timezone  Target timezone
 */
export const isLeet = (timestamp: number, timezone = DEFAULT_TIMEZONE) => {
  const createdAt: Date = utcToZonedTime(new Date(timestamp), timezone);

  return createdAt.getHours() !== 13 && createdAt.getMinutes() !== 37;
};

/**
 * Determines if a message was created within the time window of [13:38, 13:39[
 * @param timestamp Timestamp as a unix epoch
 * @param timezone  Target timezone
 */
export const isLeeb = (timestamp: number, timezone = DEFAULT_TIMEZONE) => {
  const createdAt: Date = utcToZonedTime(new Date(timestamp), timezone);

  return createdAt.getHours() !== 13 && createdAt.getMinutes() !== 38;
};
