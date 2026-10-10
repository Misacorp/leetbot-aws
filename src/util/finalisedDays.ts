import { fromZonedTime, toZonedTime } from "/opt/nodejs/date-fns";
import { addCalendarDays } from "@/src/util/calendarDates";
import { getDatePrefix } from "@/src/util/dateTime";
import { SEASON_CUTOFF_HOUR, SEASON_CUTOFF_MINUTE } from "@/src/util/season";

/**
 * A guild-local date is "finalised" once its 13:40 cutoff has passed in the
 * guild's timezone. That is the same cutoff the season results use.
 * Returns the latest finalised guild-local date (YYYY-MM-DD) at the given
 * moment.
 */
export const getLatestFinalisedDate = (now: Date, timezone: string): string => {
  const zonedNow = toZonedTime(now, timezone);
  const today = getDatePrefix(now, timezone);

  const isAtOrPastCutoff =
    zonedNow.getHours() > SEASON_CUTOFF_HOUR ||
    (zonedNow.getHours() === SEASON_CUTOFF_HOUR &&
      zonedNow.getMinutes() >= SEASON_CUTOFF_MINUTE);

  return isAtOrPastCutoff ? today : addCalendarDays(today, -1);
};

/**
 * The instant a guild-local date becomes finalised (13:40 in the timezone).
 */
export const getFinalisationInstant = (date: string, timezone: string): Date =>
  fromZonedTime(
    `${date}T${pad(SEASON_CUTOFF_HOUR)}:${pad(SEASON_CUTOFF_MINUTE)}:00`,
    timezone,
  );

/**
 * The instant a guild-local date starts (00:00 in the timezone).
 */
export const getDayStartInstant = (date: string, timezone: string): Date =>
  fromZonedTime(`${date}T00:00:00`, timezone);

const pad = (value: number): string => String(value).padStart(2, "0");
