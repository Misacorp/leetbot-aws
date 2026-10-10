// Earlier than any real leet
const EARLIEST_DATE = "2000-01-01";

/**
 * Works out which guild-local dates (YYYY-MM-DD, both inclusive) a query needs
 * to read. Without `fromDate` reading starts at the beginning; without
 * `toDate` it has no end. Returns null when the range is empty.
 */
export const resolveDateRange = (
  fromDate: string | undefined,
  toDate: string | undefined,
): { fromDate: string; toDate: string | undefined } | null => {
  const firstDate = fromDate ?? EARLIEST_DATE;

  return toDate !== undefined && firstDate > toDate
    ? null
    : { fromDate: firstDate, toDate };
};
