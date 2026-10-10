import { type LeetMessageLike, collectLeetDays } from "./collectLeetDays";

const GUILD_ID = "123456789012345678";
const HELSINKI = "Europe/Helsinki";
const NEW_YORK = "America/New_York";

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
    timezone: HELSINKI,
    ...overrides,
  });

describe("collectLeetDays", () => {
  it("groups leets by guild-local date, oldest first, with ids", async () => {
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

  describe("another timezone (America/New_York)", () => {
    // Winter (EST, UTC-5): 13:37 New York is 18:37Z
    const winterNewYork = (date: string, userId: string) => ({
      userId,
      createdAt: `${date}T18:37:00.000Z`,
    });
    // Summer (EDT, UTC-4): 13:37 New York is 17:37Z
    const summerNewYork = (date: string, userId: string) => ({
      userId,
      createdAt: `${date}T17:37:00.000Z`,
    });

    it("applies the 13:37 window in the given timezone, not Helsinki", async () => {
      const messages = [
        winterNewYork("2026-01-15", "a"),
        // A Helsinki 13:37 is not a New York 13:37
        winterLeet("2026-01-15", "helsinki"),
      ];

      const newYork = await collect(messages, { timezone: NEW_YORK });
      expect(newYork.days).toHaveLength(1);
      expect(newYork.days[0].participants.map((p) => p.userId)).toEqual(["a"]);

      const helsinki = await collect(messages, { timezone: HELSINKI });
      expect(helsinki.days[0].participants.map((p) => p.userId)).toEqual([
        "helsinki",
      ]);
    });

    it("follows the New York DST switches (2026-03-08, 2026-11-01)", async () => {
      const result = await collect(
        [
          winterNewYork("2026-03-07", "a"),
          summerNewYork("2026-03-08", "a"),
          summerNewYork("2026-10-31", "a"),
          winterNewYork("2026-11-01", "a"),
          // Wrong offset on the switch days
          winterNewYork("2026-03-08", "b"),
          summerNewYork("2026-11-01", "b"),
          // Helsinki's switch days are ordinary days in New York
          winterNewYork("2026-03-29", "c"),
          summerNewYork("2026-03-29", "d"),
        ],
        { timezone: NEW_YORK },
      );

      expect(result.days.map((day) => day.date)).toEqual([
        "2026-03-07",
        "2026-03-08",
        "2026-03-29",
        "2026-10-31",
        "2026-11-01",
      ]);
      expect(
        result.days.map((day) => day.participants.map((p) => p.userId)),
      ).toEqual([["a"], ["a"], ["d"], ["a"], ["a"]]);
    });
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
  });
});
