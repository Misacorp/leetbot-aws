// Earlier than any real leet
const EARLIEST_DATE = "2000-01-01";

/**
 * Works out which guild-local dates a request needs to read.
 * `startDate` is the first date to include; without it reading starts at the
 * beginning. Returns null when the range is empty.
 */
export const planDaysQuery = (
  startDate: string | undefined,
  latestFinalisedDate: string,
): { startDate: string; lastDate: string } | null => {
  const firstDate = startDate ?? EARLIEST_DATE;

  return firstDate > latestFinalisedDate
    ? null
    : { startDate: firstDate, lastDate: latestFinalisedDate };
};
