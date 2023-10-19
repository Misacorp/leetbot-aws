import { isLeeb, isLeet, toEpoch, utcToZonedTime } from "./dateTime";

describe("dateTime", () => {
  describe("Timezone conversion: utcToZonedTime()", () => {
    describe("Europe/Helsinki", () => {
      // Offset in the summer: +3 hours
      // Offset in the winter: +2 hours

      describe("year 2000", () => {
        it("should convert the winter time end threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 26th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 2, 26, 0, 59, 59, 999));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(2);
        });

        it("should convert the summer time start threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 26th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 2, 26, 1, 0, 0, 0));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });

        it("should convert the summer time end threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 29th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 9, 29, 1, 59, 59, 999));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(3);
        });

        it("should convert the winter time start threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 29th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 9, 29, 2, 0, 0, 0));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });
      });

      describe("year 2018", () => {
        it("should convert the winter time end threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 25th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 2, 25, 0, 59, 59, 999));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(2);
        });

        it("should convert the summer time start threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 25th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 2, 25, 1, 0, 0, 0));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });

        it("should convert the summer time end threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 28th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 9, 28, 1, 59, 59, 999));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(3);
        });

        it("should convert the winter time start threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 28th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 9, 28, 2, 0, 0, 0));
          const helsinkiDate = utcToZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });
      });

      describe("13:37", () => {
        it("should convert a summer time date of UTC 10:37 to 13:37", () => {
          const date = new Date(Date.UTC(2023, 7, 1, 10, 37));
          const helsinkiDate = utcToZonedTime(date, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(13);
          expect(helsinkiDate.getMinutes()).toBe(37);
        });

        it("should convert a winter time date of UTC 11:37 to 13:37", () => {
          const date = new Date(Date.UTC(2023, 11, 1, 11, 37));
          const helsinkiDate = utcToZonedTime(date, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(13);
          expect(helsinkiDate.getMinutes()).toBe(37);
        });
      });
    });
  });

  describe("toEpoch", () => {
    it("should convert a date to an epoch (1)", () => {
      const date = new Date(Date.UTC(2023, 0, 1, 0, 0, 0, 0));
      expect(toEpoch(date)).toEqual(1672531200);
    });

    it("should convert a date to an epoch (2)", () => {
      const date = new Date(Date.UTC(1990, 6, 15, 19, 40, 55, 0));
      expect(toEpoch(date)).toEqual(648070855);
    });
  });

  describe("isLeet", () => {
    it("should detect leet at 13:37:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 37, 0, 0));
      const epoch = toEpoch(date);

      expect(isLeet(epoch)).toBeTruthy();
    });

    it("should detect leet at 13:37:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 37, 59, 999));
      const epoch = toEpoch(date);

      expect(isLeet(epoch)).toBeTruthy();
    });

    it("should not detect leet at 13:38:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 38, 0, 0));
      const epoch = toEpoch(date);

      expect(isLeet(epoch)).toBeFalsy();
    });

    it("should not detect leet at 13:36:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 36, 59, 999));
      const epoch = toEpoch(date);

      expect(isLeet(epoch)).toBeFalsy();
    });
  });

  describe("isLeeb", () => {
    it("should detect leeb at 13:38:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 38, 0, 0));
      const epoch = toEpoch(date);

      expect(isLeeb(epoch)).toBeTruthy();
    });

    it("should detect leet at 13:38:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 38, 59, 999));
      const epoch = toEpoch(date);

      expect(isLeeb(epoch)).toBeTruthy();
    });

    it("should not detect leeb at 13:39:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 39, 0, 0));
      const epoch = toEpoch(date);

      expect(isLeeb(epoch)).toBeFalsy();
    });

    it("should not detect leeb at 13:37:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 37, 59, 999));
      const epoch = toEpoch(date);

      expect(isLeeb(epoch)).toBeFalsy();
    });
  });
});
