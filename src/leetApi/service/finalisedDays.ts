import { fromZonedTime, toZonedTime } from "/opt/nodejs/date-fns";
import { getDatePrefix } from "@/src/util/dateTime";
import {
  SEASON_CUTOFF_HOUR,
  SEASON_CUTOFF_MINUTE,
  SEASON_TIMEZONE,
} from "@/src/util/season";
import { addCalendarDays } from "./calendarDates";

/**
 * A Helsinki date is "finalised" once its 13:40 cutoff has passed.
 * That is the same cutoff the season results use. Returns the latest
 * finalised date (YYYY-MM-DD) at the given moment.
 */
export const getLatestFinalisedDate = (now: Date): string => {
  const zonedNow = toZonedTime(now, SEASON_TIMEZONE);
  const today = getDatePrefix(now, SEASON_TIMEZONE);

  const isAtOrPastCutoff =
    zonedNow.getHours() > SEASON_CUTOFF_HOUR ||
    (zonedNow.getHours() === SEASON_CUTOFF_HOUR &&
      zonedNow.getMinutes() >= SEASON_CUTOFF_MINUTE);

  return isAtOrPastCutoff ? today : addCalendarDays(today, -1);
};

/**
 * The instant a Helsinki date becomes finalised (13:40 Helsinki time).
 */
export const getFinalisationInstant = (date: string): Date =>
  fromZonedTime(
    `${date}T${pad(SEASON_CUTOFF_HOUR)}:${pad(SEASON_CUTOFF_MINUTE)}:00`,
    SEASON_TIMEZONE,
  );

/**
 * The instant a Helsinki date starts (00:00 Helsinki time).
 */
export const getDayStartInstant = (date: string): Date =>
  fromZonedTime(`${date}T00:00:00`, SEASON_TIMEZONE);

const pad = (value: number): string => String(value).padStart(2, "0");
