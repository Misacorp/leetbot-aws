import { collectLeetDays, type LeetMessageLike } from "./collectLeetDays";
import { buildDaysResponse } from "./buildDaysResponse";
import { decodeDaysCursor } from "./daysCursor";
import { planDaysQuery } from "./planDaysQuery";

const GUILD_ID = "123456789012345678";

// Winter time (EET, UTC+2): 13:37 Helsinki is 11:37Z
const winterLeet = (date: string, userId: string, seconds = "00") => ({
  userId,
  createdAt: `${date}T11:37:${seconds}.000Z`,
});

// Summer time (EEST, UTC+3): 13:37 Helsinki is 10:37Z
const summerLeet = (date: string, userId: string, seconds = "00") => ({
  userId,
  createdAt: `${date}T10:37:${seconds}.000Z`,
});

const collect = (
  messages: LeetMessageLike[],
  overrides: Partial<Parameters<typeof collectLeetDays>[0]> = {},
) =>
  collectLeetDays({
    messages,
    guildId: GUILD_ID,
    startDate: "2000-01-01",
    lastDate: "2999-12-31",
    limit: 31,
    ...overrides,
  });

describe("collectLeetDays", () => {
  it("groups leets by Helsinki date, oldest first, with ids", async () => {
    const result = await collect([
      winterLeet("2026-01-14", "a"),
      winterLeet("2026-01-15", "b"),
    ]);

    expect(result.hasMore).toBe(false);
    expect(result.days).toEqual([
      {
        id: `${GUILD_ID}:2026-01-14`,
        date: "2026-01-14",
        participants: [{ userId: "a", leetAt: "2026-01-14T11:37:00.000Z" }],
      },
      {
        id: `${GUILD_ID}:2026-01-15`,
        date: "2026-01-15",
        participants: [{ userId: "b", leetAt: "2026-01-15T11:37:00.000Z" }],
      },
    ]);
  });

  it("drops messages outside the 13:37 window", async () => {
    const result = await collect([
      // 13:36 and 13:38 Helsinki
      { userId: "early", createdAt: "2026-01-15T11:36:59.999Z" },
      { userId: "late", createdAt: "2026-01-15T11:38:00.000Z" },
      // 13:37 UTC is 15:37 Helsinki
      { userId: "utc", createdAt: "2026-01-15T13:37:00.000Z" },
      winterLeet("2026-01-15", "real"),
    ]);

    expect(result.days).toHaveLength(1);
    expect(result.days[0].participants.map((p) => p.userId)).toEqual(["real"]);
  });

  it("ignores messages with an unparseable timestamp", async () => {
    const result = await collect([{ userId: "a", createdAt: "nonsense" }]);

    expect(result).toEqual({ days: [], hasMore: false });
  });

  it("applies the 13:37 window in Helsinki time across DST", async () => {
    const result = await collect([
      winterLeet("2026-03-28", "a"),
      summerLeet("2026-03-29", "a"),
      summerLeet("2026-10-24", "a"),
      winterLeet("2026-10-25", "a"),
      // Wrong offset on the switch days: 12:37 / 14:37 Helsinki
      winterLeet("2026-03-29", "b"),
      summerLeet("2026-10-25", "b"),
    ]);

    expect(result.days.map((day) => day.date)).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-10-24",
      "2026-10-25",
    ]);
    for (const day of result.days) {
      expect(day.participants.map((p) => p.userId)).toEqual(["a"]);
    }
  });

  it("keeps each player's earliest leet per day", async () => {
    const result = await collect([
      winterLeet("2026-01-15", "a", "10"),
      winterLeet("2026-01-15", "a", "05"),
      winterLeet("2026-01-15", "a", "30"),
    ]);

    expect(result.days[0].participants).toEqual([
      { userId: "a", leetAt: "2026-01-15T11:37:05.000Z" },
    ]);
  });

  it("sorts participants by leet time, then user id", async () => {
    const result = await collect([
      winterLeet("2026-01-15", "c", "20"),
      winterLeet("2026-01-15", "b", "10"),
      winterLeet("2026-01-15", "a", "10"),
    ]);

    expect(result.days[0].participants.map((p) => p.userId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("omits days without leets", async () => {
    const result = await collect([
      winterLeet("2026-01-10", "a"),
      winterLeet("2026-01-20", "a"),
    ]);

    expect(result.days.map((day) => day.date)).toEqual([
      "2026-01-10",
      "2026-01-20",
    ]);
  });

  it("only includes dates inside the requested range", async () => {
    const result = await collect(
      [
        winterLeet("2026-01-09", "a"),
        winterLeet("2026-01-10", "a"),
        winterLeet("2026-01-11", "a"),
        winterLeet("2026-01-12", "a"),
      ],
      { startDate: "2026-01-10", lastDate: "2026-01-11" },
    );

    expect(result.days.map((day) => day.date)).toEqual([
      "2026-01-10",
      "2026-01-11",
    ]);
    expect(result.hasMore).toBe(false);
  });

  describe("paging", () => {
    const fiveDays = [
      winterLeet("2026-01-01", "a"),
      winterLeet("2026-01-01", "b"),
      winterLeet("2026-01-02", "a"),
      winterLeet("2026-01-03", "a"),
      winterLeet("2026-01-03", "b"),
      winterLeet("2026-01-03", "c"),
      winterLeet("2026-01-04", "a"),
      winterLeet("2026-01-05", "a"),
    ];

    it("stops at the limit and reports more, without splitting a day", async () => {
      const result = await collect(fiveDays, { limit: 3 });

      expect(result.hasMore).toBe(true);
      expect(result.days.map((day) => day.date)).toEqual([
        "2026-01-01",
        "2026-01-02",
        "2026-01-03",
      ]);
      expect(result.days[2].participants).toHaveLength(3);
    });

    it("reports no more when exactly limit days exist", async () => {
      const result = await collect(fiveDays, { limit: 5 });

      expect(result.hasMore).toBe(false);
      expect(result.days).toHaveLength(5);
    });

    it("reports no more when fewer than limit days exist", async () => {
      const result = await collect(fiveDays, { limit: 100 });

      expect(result.hasMore).toBe(false);
      expect(result.days).toHaveLength(5);
    });

    it("stops reading the source once the extra day is seen", async () => {
      let consumed = 0;
      async function* source() {
        for (const message of fiveDays) {
          consumed += 1;
          yield message;
        }
      }

      await collect(source() as unknown as LeetMessageLike[], { limit: 1 });

      // Two messages for day one, then the first message of day two
      expect(consumed).toBe(3);
    });

    it("pages through everything using cursors", async () => {
      const seen: string[] = [];
      let after: string | undefined;
      let guard = 0;

      for (;;) {
        const plan = planDaysQuery({ after }, "2999-12-31");
        const result = await collect(fiveDays, {
          limit: 2,
          startDate: plan!.startDate,
          lastDate: plan!.lastDate,
        });
        const page = buildDaysResponse({
          guildId: GUILD_ID,
          days: result.days,
          hasMore: result.hasMore,
          after,
        });
        seen.push(...page.days.map((day) => day.date));

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
});

describe("planDaysQuery", () => {
  it("starts at the beginning when neither after nor since is given", () => {
    expect(planDaysQuery({}, "2026-03-01")).toEqual({
      startDate: "2000-01-01",
      lastDate: "2026-03-01",
    });
  });

  it("starts at since (inclusive)", () => {
    expect(planDaysQuery({ since: "2026-02-01" }, "2026-03-01")).toEqual({
      startDate: "2026-02-01",
      lastDate: "2026-03-01",
    });
  });

  it("starts the day after the cursor", () => {
    expect(planDaysQuery({ after: "2026-02-28" }, "2026-03-05")).toEqual({
      startDate: "2026-03-01",
      lastDate: "2026-03-05",
    });
  });

  it("uses the later of since and the day after the cursor", () => {
    expect(
      planDaysQuery({ after: "2026-02-10", since: "2026-02-20" }, "2026-03-01")
        ?.startDate,
    ).toBe("2026-02-20");
    expect(
      planDaysQuery({ after: "2026-02-25", since: "2026-02-20" }, "2026-03-01")
        ?.startDate,
    ).toBe("2026-02-26");
  });

  it("returns null when the range starts after the latest finalised date", () => {
    expect(planDaysQuery({ after: "2026-03-01" }, "2026-03-01")).toBeNull();
    expect(planDaysQuery({ since: "2026-03-02" }, "2026-03-01")).toBeNull();
  });
});

describe("buildDaysResponse", () => {
  const day = (date: string) => ({
    id: `${GUILD_ID}:${date}`,
    date,
    participants: [],
  });

  it("returns the last returned date as the cursor, even with no more days", () => {
    const response = buildDaysResponse({
      guildId: GUILD_ID,
      days: [day("2026-01-01"), day("2026-01-02")],
      hasMore: false,
    });

    expect(decodeDaysCursor(response.nextCursor!)).toBe("2026-01-02");
    expect(response.hasMore).toBe(false);
  });

  it("is null when nothing was returned and no cursor was given", () => {
    expect(
      buildDaysResponse({ guildId: GUILD_ID, days: [], hasMore: false })
        .nextCursor,
    ).toBeNull();
  });

  it("echoes the given cursor date when nothing new was returned", () => {
    const response = buildDaysResponse({
      guildId: GUILD_ID,
      days: [],
      hasMore: false,
      after: "2026-01-05",
    });

    expect(decodeDaysCursor(response.nextCursor!)).toBe("2026-01-05");
  });
});
