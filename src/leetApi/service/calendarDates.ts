const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Keeps timezone conversions away from historic calendar oddities
const MIN_YEAR = 2000;
const MAX_YEAR = 2999;

/**
 * Checks that a string is a real calendar date in YYYY-MM-DD format.
 */
export const isValidCalendarDate = (value: string): boolean => {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/**
 * Adds (or subtracts) whole calendar days to a YYYY-MM-DD date.
 * Pure calendar arithmetic, so it is not affected by DST.
 */
export const addCalendarDays = (date: string, days: number): string => {
  const match = DATE_PATTERN.exec(date);
  if (!match) {
    throw new Error("Invalid calendar date");
  }

  const shifted = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );

  return shifted.toISOString().slice(0, 10);
};
