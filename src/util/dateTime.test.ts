import { isLeeb, isLeet, toZonedTime, getDatePrefix } from "./dateTime";
import leetMessageJson from "@/test/__mocks__/message_leet.json";
import leebMessageJson from "@/test/__mocks__/message_leeb.json";
import { type Message } from "/opt/nodejs/discord";

const leetMessage: Message = leetMessageJson as unknown as Message;
const leebMessage: Message = leebMessageJson as unknown as Message;

describe("dateTime", () => {
  describe("Timezone conversion: toZonedTime()", () => {
    describe("Europe/Helsinki", () => {
      // Offset in the summer: +3 hours
      // Offset in the winter: +2 hours

      describe("year 2000", () => {
        it("should convert the winter time end threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 26th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 2, 26, 0, 59, 59, 999));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(2);
        });

        it("should convert the summer time start threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 26th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 2, 26, 1, 0, 0, 0));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });

        it("should convert the summer time end threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 29th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 9, 29, 1, 59, 59, 999));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(3);
        });

        it("should convert the winter time start threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 29th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2000, 9, 29, 2, 0, 0, 0));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });
      });

      describe("year 2018", () => {
        it("should convert the winter time end threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 25th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 2, 25, 0, 59, 59, 999));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(2);
        });

        it("should convert the summer time start threshold to the correct time", () => {
          // Winter time in the year 2000 ended on the 25th of March at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 2, 25, 1, 0, 0, 0));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });

        it("should convert the summer time end threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 28th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 9, 28, 1, 59, 59, 999));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(3);
        });

        it("should convert the winter time start threshold to the correct time", () => {
          // Summer time in the year 2000 ended on the 28th of October at 4 AM.
          const summerDate = new Date(Date.UTC(2018, 9, 28, 2, 0, 0, 0));
          const helsinkiDate = toZonedTime(summerDate, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(4);
        });
      });

      describe("13:37", () => {
        it("should convert a summer time date of UTC 10:37 to 13:37", () => {
          const date = new Date(Date.UTC(2023, 7, 1, 10, 37));
          const helsinkiDate = toZonedTime(date, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(13);
          expect(helsinkiDate.getMinutes()).toBe(37);
        });

        it("should convert a winter time date of UTC 11:37 to 13:37", () => {
          const date = new Date(Date.UTC(2023, 11, 1, 11, 37));
          const helsinkiDate = toZonedTime(date, "Europe/Helsinki");

          expect(helsinkiDate.getHours()).toBe(13);
          expect(helsinkiDate.getMinutes()).toBe(37);
        });
      });
    });
  });

  describe("isLeet", () => {
    it("should detect leet from a Discord message sent at 13:37", () => {
      const epoch = leetMessage.createdTimestamp;

      expect(isLeet(epoch)).toBeTruthy();
    });

    it("should detect leet at 13:37:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 37, 0, 0));
      const epoch = date.getTime();

      expect(isLeet(epoch)).toBeTruthy();
    });

    it("should detect leet at 13:37:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 37, 59, 999));
      const epoch = date.getTime();

      expect(isLeet(epoch)).toBeTruthy();
    });

    it("should not detect leet at 13:38:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 38, 0, 0));
      const epoch = date.getTime();

      expect(isLeet(epoch)).toBeFalsy();
    });

    it("should not detect leet at 13:36:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 36, 59, 999));
      const epoch = date.getTime();

      expect(isLeet(epoch)).toBeFalsy();
    });
  });

  describe("isLeeb", () => {
    it("should detect leeb from a Discord message sent at 13:38", () => {
      const epoch = leebMessage.createdTimestamp;

      expect(isLeeb(epoch)).toBeTruthy();
    });

    it("should detect leeb at 13:38:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 38, 0, 0));
      const epoch = date.getTime();

      expect(isLeeb(epoch)).toBeTruthy();
    });

    it("should detect leet at 13:38:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 38, 59, 999));
      const epoch = date.getTime();

      expect(isLeeb(epoch)).toBeTruthy();
    });

    it("should not detect leeb at 13:39:00.000", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 39, 0, 0));
      const epoch = date.getTime();

      expect(isLeeb(epoch)).toBeFalsy();
    });

    it("should not detect leeb at 13:37:59.999", () => {
      // Summer time, +3 hour offset
      const date = new Date(Date.UTC(2023, 6, 1, 10, 37, 59, 999));
      const epoch = date.getTime();

      expect(isLeeb(epoch)).toBeFalsy();
    });
  });

  describe("getDatePrefix", () => {
    describe("Unix timestamp input", () => {
      it("should return correct date prefix for Unix timestamp in summer time", () => {
        // July 15, 2023 at 10:30 UTC = 13:30 Helsinki summer time
        const timestamp = new Date(Date.UTC(2023, 6, 15, 10, 30, 0)).getTime();

        expect(getDatePrefix(timestamp)).toBe("2023-07-15");
      });

      it("should return correct date prefix for Unix timestamp in winter time", () => {
        // January 15, 2023 at 11:30 UTC = 13:30 Helsinki winter time
        const timestamp = new Date(Date.UTC(2023, 0, 15, 11, 30, 0)).getTime();

        expect(getDatePrefix(timestamp)).toBe("2023-01-15");
      });

      it("should handle timezone conversion correctly at day boundary", () => {
        // UTC midnight should be next day in Helsinki
        const timestamp = new Date(Date.UTC(2023, 6, 15, 0, 0, 0)).getTime();

        expect(getDatePrefix(timestamp)).toBe("2023-07-15");
      });
    });

    describe("ISO string input", () => {
      it("should return correct date prefix for ISO string", () => {
        const isoString = "2023-10-14T12:33:56.789Z";

        expect(getDatePrefix(isoString)).toBe("2023-10-14");
      });

      it("should handle ISO string without milliseconds", () => {
        const isoString = "2023-12-25T23:59:59Z";

        expect(getDatePrefix(isoString)).toBe("2023-12-26"); // Next day in Helsinki
      });

      it("should handle ISO string with timezone offset", () => {
        const isoString = "2023-06-15T13:37:00+02:00";

        expect(getDatePrefix(isoString)).toBe("2023-06-15");
      });
    });

    describe("Date object input", () => {
      it("should return correct date prefix for Date object", () => {
        const date = new Date(Date.UTC(2023, 8, 20, 15, 45, 30));

        expect(getDatePrefix(date)).toBe("2023-09-20");
      });

      it("should handle Date object at midnight UTC", () => {
        const date = new Date(Date.UTC(2023, 11, 31, 0, 0, 0));

        expect(getDatePrefix(date)).toBe("2023-12-31");
      });
    });

    describe("Timezone handling", () => {
      it("should use default timezone (Europe/Helsinki) when not specified", () => {
        const timestamp = new Date(Date.UTC(2023, 6, 15, 21, 0, 0)).getTime();

        expect(getDatePrefix(timestamp)).toBe("2023-07-16"); // Next day in Helsinki
      });

      it("should use specified timezone", () => {
        const timestamp = new Date(Date.UTC(2023, 6, 15, 21, 0, 0)).getTime();

        expect(getDatePrefix(timestamp, "UTC")).toBe("2023-07-15");
        expect(getDatePrefix(timestamp, "America/New_York")).toBe("2023-07-15");
      });
    });

    describe("Edge cases", () => {
      it("should handle leap year date", () => {
        const timestamp = new Date(Date.UTC(2024, 1, 29, 12, 0, 0)).getTime();

        expect(getDatePrefix(timestamp)).toBe("2024-02-29");
      });

      it("should handle year boundary crossing", () => {
        // New Year's Eve UTC becomes New Year's Day in Helsinki
        const timestamp = new Date(Date.UTC(2022, 11, 31, 22, 30, 0)).getTime();

        expect(getDatePrefix(timestamp)).toBe("2023-01-01");
      });

      it("should handle various date formats consistently", () => {
        const baseDate = "2023-05-15T10:30:00.000Z";
        const timestamp = new Date(baseDate).getTime();
        const dateObject = new Date(baseDate);

        const result1 = getDatePrefix(timestamp);
        const result2 = getDatePrefix(baseDate);
        const result3 = getDatePrefix(dateObject);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe("2023-05-15");
      });
    });
  });
});
