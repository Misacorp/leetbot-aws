import {
  getDayStartInstant,
  getFinalisationInstant,
  getLatestFinalisedDate,
} from "./finalisedDays";

const utc = (iso: string) => new Date(iso);

describe("finalisedDays", () => {
  describe("getLatestFinalisedDate", () => {
    it("does not finalise today before 13:40 Helsinki (winter time)", () => {
      // 13:39 EET = 11:39Z
      expect(getLatestFinalisedDate(utc("2026-01-15T11:39:59.999Z"))).toBe(
        "2026-01-14",
      );
    });

    it("finalises today at 13:40 Helsinki (winter time)", () => {
      expect(getLatestFinalisedDate(utc("2026-01-15T11:40:00.000Z"))).toBe(
        "2026-01-15",
      );
    });

    it("does not finalise today before 13:40 Helsinki (summer time)", () => {
      // 13:39 EEST = 10:39Z
      expect(getLatestFinalisedDate(utc("2026-07-15T10:39:59.999Z"))).toBe(
        "2026-07-14",
      );
    });

    it("finalises today at 13:40 Helsinki (summer time)", () => {
      expect(getLatestFinalisedDate(utc("2026-07-15T10:40:00.000Z"))).toBe(
        "2026-07-15",
      );
    });

    it("uses the Helsinki date after midnight, not the UTC date", () => {
      // 00:30 EEST on the 16th is still the 15th in UTC
      expect(getLatestFinalisedDate(utc("2026-07-15T21:30:00.000Z"))).toBe(
        "2026-07-15",
      );
      // 00:30 EET on the 16th
      expect(getLatestFinalisedDate(utc("2026-01-15T22:30:00.000Z"))).toBe(
        "2026-01-15",
      );
    });

    describe("spring DST switch on 2026-03-29", () => {
      it("uses winter time on the day before", () => {
        expect(getLatestFinalisedDate(utc("2026-03-28T11:39:00Z"))).toBe(
          "2026-03-27",
        );
        expect(getLatestFinalisedDate(utc("2026-03-28T11:40:00Z"))).toBe(
          "2026-03-28",
        );
      });

      it("uses summer time on the switch day", () => {
        expect(getLatestFinalisedDate(utc("2026-03-29T10:39:00Z"))).toBe(
          "2026-03-28",
        );
        expect(getLatestFinalisedDate(utc("2026-03-29T10:40:00Z"))).toBe(
          "2026-03-29",
        );
      });
    });

    describe("autumn DST switch on 2026-10-25", () => {
      it("uses summer time on the day before", () => {
        expect(getLatestFinalisedDate(utc("2026-10-24T10:39:00Z"))).toBe(
          "2026-10-23",
        );
        expect(getLatestFinalisedDate(utc("2026-10-24T10:40:00Z"))).toBe(
          "2026-10-24",
        );
      });

      it("uses winter time on the switch day", () => {
        // 10:40Z would be 12:40 EET: too early
        expect(getLatestFinalisedDate(utc("2026-10-25T10:40:00Z"))).toBe(
          "2026-10-24",
        );
        expect(getLatestFinalisedDate(utc("2026-10-25T11:39:00Z"))).toBe(
          "2026-10-24",
        );
        expect(getLatestFinalisedDate(utc("2026-10-25T11:40:00Z"))).toBe(
          "2026-10-25",
        );
      });
    });

    it("rolls over month and year boundaries", () => {
      expect(getLatestFinalisedDate(utc("2027-01-01T05:00:00Z"))).toBe(
        "2026-12-31",
      );
    });
  });

  describe("getFinalisationInstant", () => {
    it("is 13:40 Helsinki time on each side of the DST switches", () => {
      expect(getFinalisationInstant("2026-03-28").toISOString()).toBe(
        "2026-03-28T11:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-03-29").toISOString()).toBe(
        "2026-03-29T10:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-10-24").toISOString()).toBe(
        "2026-10-24T10:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-10-25").toISOString()).toBe(
        "2026-10-25T11:40:00.000Z",
      );
    });
  });

  describe("getDayStartInstant", () => {
    it("is midnight Helsinki time", () => {
      expect(getDayStartInstant("2026-01-15").toISOString()).toBe(
        "2026-01-14T22:00:00.000Z",
      );
      expect(getDayStartInstant("2026-07-15").toISOString()).toBe(
        "2026-07-14T21:00:00.000Z",
      );
    });
  });
});
