import { collectLeetDays } from "@/src/leetDays/collectLeetDays";
import { resolveDateRange } from "@/src/leetDays/resolveDateRange";
import { buildDaysResponse } from "./buildDaysResponse";
import { createServiceInput } from "./createServiceInput";
import { decodeDaysCursor } from "./daysCursor";

const GUILD_ID = "123456789012345678";
const TIMEZONE = "Europe/Helsinki";

const day = (date: string) => ({
  id: `${GUILD_ID}:${date}`,
  date,
  participants: [],
});

describe("buildDaysResponse", () => {
  it("returns the last returned date as the cursor, even with no more days", () => {
    const response = buildDaysResponse({
      guildId: GUILD_ID,
      timezone: TIMEZONE,
      days: [day("2026-01-01"), day("2026-01-02")],
      hasMore: false,
    });

    expect(decodeDaysCursor(response.nextCursor!)).toBe("2026-01-02");
    expect(response.hasMore).toBe(false);
  });

  it("reports the timezone the dates belong to", () => {
    expect(
      buildDaysResponse({
        guildId: GUILD_ID,
        timezone: "America/New_York",
        days: [],
        hasMore: false,
      }).timezone,
    ).toBe("America/New_York");
  });

  it("is null when nothing was returned and no cursor was given", () => {
    expect(
      buildDaysResponse({
        guildId: GUILD_ID,
        timezone: TIMEZONE,
        days: [],
        hasMore: false,
      }).nextCursor,
    ).toBeNull();
  });

  it("echoes the given cursor date when nothing new was returned", () => {
    const response = buildDaysResponse({
      guildId: GUILD_ID,
      timezone: TIMEZONE,
      days: [],
      hasMore: false,
      after: "2026-01-05",
    });

    expect(decodeDaysCursor(response.nextCursor!)).toBe("2026-01-05");
  });

  it("pages through everything using cursors", async () => {
    const winterLeet = (date: string, userId: string) => ({
      userId,
      createdAt: `${date}T11:37:00.000Z`,
    });
    const messages = [
      winterLeet("2026-01-01", "a"),
      winterLeet("2026-01-02", "a"),
      winterLeet("2026-01-03", "a"),
      winterLeet("2026-01-04", "a"),
      winterLeet("2026-01-05", "a"),
    ];
    const seen: string[] = [];
    let after: string | undefined;
    let guard = 0;

    for (;;) {
      const { fromDate, limit } = createServiceInput({ after, limit: 2 });
      const range = resolveDateRange(fromDate, "2999-12-31");
      // Pages depend on the previous cursor, so they must run in order
      // eslint-disable-next-line no-await-in-loop
      const result = await collectLeetDays({
        messages,
        guildId: GUILD_ID,
        fromDate: range!.fromDate,
        toDate: range!.toDate,
        limit,
        timezone: TIMEZONE,
      });
      const page = buildDaysResponse({
        guildId: GUILD_ID,
        timezone: TIMEZONE,
        days: result.days,
        hasMore: result.hasMore,
        after,
      });
      seen.push(...page.days.map((d) => d.date));

      if (!page.hasMore) {
        break;
      }
      after = decodeDaysCursor(page.nextCursor!)!;
      guard += 1;
      expect(guard).toBeLessThan(10);
    }

    expect(seen).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
    ]);
  });
});
