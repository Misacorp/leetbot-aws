import { getDatePrefix } from "@/src/util/dateTime";
import { toSeasonDateRange, getLastCompletedSeasonKey } from "./season";

describe("season", () => {
  describe("getLastCompletedSeasonKey", () => {
    it("uses the previous month before the cutoff on the last day", () => {
      const timestamp = new Date(Date.UTC(2024, 2, 31, 10, 39, 0));

      expect(getLastCompletedSeasonKey(timestamp)).toBe("2024-02");
    });

    it("uses the current month at the cutoff on the last day", () => {
      const timestamp = new Date(Date.UTC(2024, 2, 31, 10, 40, 0));

      expect(getLastCompletedSeasonKey(timestamp)).toBe("2024-03");
    });

    it("uses the previous month during a manual rerun in the following month", () => {
      const timestamp = new Date(Date.UTC(2024, 3, 15, 9, 0, 0));

      expect(getLastCompletedSeasonKey(timestamp)).toBe("2024-03");
    });

    it("uses the provided timezone instead of Helsinki", () => {
      const timestamp = new Date(Date.UTC(2024, 2, 31, 17, 39, 0));

      expect(getLastCompletedSeasonKey(timestamp, "America/New_York")).toBe(
        "2024-02",
      );
    });
  });

  describe("toSeasonDateRange", () => {
    it("creates a full Helsinki month window", () => {
      const { startDate, endDate } = toSeasonDateRange("2024-10");

      expect(getDatePrefix(startDate)).toBe("2024-10-01");
      expect(getDatePrefix(endDate)).toBe("2024-10-31");
    });

    it("handles DST month boundaries correctly", () => {
      const { startDate, endDate } = toSeasonDateRange("2024-03");

      expect(getDatePrefix(startDate)).toBe("2024-03-01");
      expect(getDatePrefix(endDate)).toBe("2024-03-31");
    });

    it("creates a full month window in a different timezone", () => {
      const { startDate, endDate } = toSeasonDateRange(
        "2024-10",
        "America/New_York",
      );

      expect(getDatePrefix(startDate, "America/New_York")).toBe("2024-10-01");
      expect(getDatePrefix(endDate, "America/New_York")).toBe("2024-10-31");
    });

    it("throws for an invalid season key", () => {
      expect(() => toSeasonDateRange("2024-13")).toThrow(
        "Invalid season key: 2024-13",
      );
    });
  });
});
