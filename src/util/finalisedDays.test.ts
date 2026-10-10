import {
  getDayStartInstant,
  getFinalisationInstant,
  getLatestFinalisedDate,
} from "./finalisedDays";

const HELSINKI = "Europe/Helsinki";
const NEW_YORK = "America/New_York";

const utc = (iso: string) => new Date(iso);

describe("finalisedDays", () => {
  describe("getLatestFinalisedDate", () => {
    it("does not finalise today before 13:40 Helsinki (winter time)", () => {
      // 13:39 EET = 11:39Z
      expect(
        getLatestFinalisedDate(utc("2026-01-15T11:39:59.999Z"), HELSINKI),
      ).toBe("2026-01-14");
    });

    it("finalises today at 13:40 Helsinki (winter time)", () => {
      expect(
        getLatestFinalisedDate(utc("2026-01-15T11:40:00.000Z"), HELSINKI),
      ).toBe("2026-01-15");
    });

    it("does not finalise today before 13:40 Helsinki (summer time)", () => {
      // 13:39 EEST = 10:39Z
      expect(
        getLatestFinalisedDate(utc("2026-07-15T10:39:59.999Z"), HELSINKI),
      ).toBe("2026-07-14");
    });

    it("finalises today at 13:40 Helsinki (summer time)", () => {
      expect(
        getLatestFinalisedDate(utc("2026-07-15T10:40:00.000Z"), HELSINKI),
      ).toBe("2026-07-15");
    });

    it("uses the Helsinki date after midnight, not the UTC date", () => {
      // 00:30 EEST on the 16th is still the 15th in UTC
      expect(
        getLatestFinalisedDate(utc("2026-07-15T21:30:00.000Z"), HELSINKI),
      ).toBe("2026-07-15");
      // 00:30 EET on the 16th
      expect(
        getLatestFinalisedDate(utc("2026-01-15T22:30:00.000Z"), HELSINKI),
      ).toBe("2026-01-15");
    });

    describe("spring DST switch on 2026-03-29", () => {
      it("uses winter time on the day before", () => {
        expect(
          getLatestFinalisedDate(utc("2026-03-28T11:39:00Z"), HELSINKI),
        ).toBe("2026-03-27");
        expect(
          getLatestFinalisedDate(utc("2026-03-28T11:40:00Z"), HELSINKI),
        ).toBe("2026-03-28");
      });

      it("uses summer time on the switch day", () => {
        expect(
          getLatestFinalisedDate(utc("2026-03-29T10:39:00Z"), HELSINKI),
        ).toBe("2026-03-28");
        expect(
          getLatestFinalisedDate(utc("2026-03-29T10:40:00Z"), HELSINKI),
        ).toBe("2026-03-29");
      });
    });

    describe("autumn DST switch on 2026-10-25", () => {
      it("uses summer time on the day before", () => {
        expect(
          getLatestFinalisedDate(utc("2026-10-24T10:39:00Z"), HELSINKI),
        ).toBe("2026-10-23");
        expect(
          getLatestFinalisedDate(utc("2026-10-24T10:40:00Z"), HELSINKI),
        ).toBe("2026-10-24");
      });

      it("uses winter time on the switch day", () => {
        // 10:40Z would be 12:40 EET: too early
        expect(
          getLatestFinalisedDate(utc("2026-10-25T10:40:00Z"), HELSINKI),
        ).toBe("2026-10-24");
        expect(
          getLatestFinalisedDate(utc("2026-10-25T11:39:00Z"), HELSINKI),
        ).toBe("2026-10-24");
        expect(
          getLatestFinalisedDate(utc("2026-10-25T11:40:00Z"), HELSINKI),
        ).toBe("2026-10-25");
      });
    });

    it("rolls over month and year boundaries", () => {
      expect(
        getLatestFinalisedDate(utc("2027-01-01T05:00:00Z"), HELSINKI),
      ).toBe("2026-12-31");
    });
  });

  describe("getFinalisationInstant", () => {
    it("is 13:40 Helsinki time on each side of the DST switches", () => {
      expect(getFinalisationInstant("2026-03-28", HELSINKI).toISOString()).toBe(
        "2026-03-28T11:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-03-29", HELSINKI).toISOString()).toBe(
        "2026-03-29T10:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-10-24", HELSINKI).toISOString()).toBe(
        "2026-10-24T10:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-10-25", HELSINKI).toISOString()).toBe(
        "2026-10-25T11:40:00.000Z",
      );
    });
  });

  describe("getDayStartInstant", () => {
    it("is midnight Helsinki time", () => {
      expect(getDayStartInstant("2026-01-15", HELSINKI).toISOString()).toBe(
        "2026-01-14T22:00:00.000Z",
      );
      expect(getDayStartInstant("2026-07-15", HELSINKI).toISOString()).toBe(
        "2026-07-14T21:00:00.000Z",
      );
    });
  });

  describe("another timezone (America/New_York)", () => {
    it("applies the 13:40 cutoff in the given timezone, not Helsinki", () => {
      // 13:39 EST = 18:39Z, 13:40 EST = 18:40Z
      expect(
        getLatestFinalisedDate(utc("2026-01-15T18:39:59.999Z"), NEW_YORK),
      ).toBe("2026-01-14");
      expect(
        getLatestFinalisedDate(utc("2026-01-15T18:40:00.000Z"), NEW_YORK),
      ).toBe("2026-01-15");
      // The same instant is already past the cutoff in Helsinki
      expect(
        getLatestFinalisedDate(utc("2026-01-15T18:39:59.999Z"), HELSINKI),
      ).toBe("2026-01-15");
    });

    it("uses the guild-local date after midnight UTC", () => {
      // 20:00 EST on the 15th is already the 16th in UTC
      expect(
        getLatestFinalisedDate(utc("2026-01-16T01:00:00.000Z"), NEW_YORK),
      ).toBe("2026-01-15");
    });

    it("switches offset on the New York DST dates (2026-03-08, 2026-11-01)", () => {
      // Spring: EST until 2026-03-08, then EDT (13:40 = 17:40Z)
      expect(
        getLatestFinalisedDate(utc("2026-03-07T18:39:00Z"), NEW_YORK),
      ).toBe("2026-03-06");
      expect(
        getLatestFinalisedDate(utc("2026-03-07T18:40:00Z"), NEW_YORK),
      ).toBe("2026-03-07");
      expect(
        getLatestFinalisedDate(utc("2026-03-08T17:39:00Z"), NEW_YORK),
      ).toBe("2026-03-07");
      expect(
        getLatestFinalisedDate(utc("2026-03-08T17:40:00Z"), NEW_YORK),
      ).toBe("2026-03-08");

      // Autumn: EDT until 2026-11-01, then EST (13:40 = 18:40Z)
      expect(
        getLatestFinalisedDate(utc("2026-11-01T17:40:00Z"), NEW_YORK),
      ).toBe("2026-10-31");
      expect(
        getLatestFinalisedDate(utc("2026-11-01T18:40:00Z"), NEW_YORK),
      ).toBe("2026-11-01");
    });

    it("computes finalisation and day start instants in the timezone", () => {
      expect(getFinalisationInstant("2026-03-07", NEW_YORK).toISOString()).toBe(
        "2026-03-07T18:40:00.000Z",
      );
      expect(getFinalisationInstant("2026-03-08", NEW_YORK).toISOString()).toBe(
        "2026-03-08T17:40:00.000Z",
      );
      expect(getDayStartInstant("2026-03-08", NEW_YORK).toISOString()).toBe(
        "2026-03-08T05:00:00.000Z",
      );
      expect(getDayStartInstant("2026-03-09", NEW_YORK).toISOString()).toBe(
        "2026-03-09T04:00:00.000Z",
      );
    });
  });
});
