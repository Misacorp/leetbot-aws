import { paginateGuildMessages } from "@/src/repository/message/getGuildMessages";
import { getLeetDaysInRange } from "./getLeetDaysInRange";

jest.mock("@/src/repository/message/getGuildMessages");

const GUILD_ID = "123456789012345678";
const NEW_YORK = "America/New_York";

describe("getLeetDaysInRange", () => {
  it("reads guild-local dates in a non-Helsinki timezone without any API types", async () => {
    // 13:37 in New York in winter (EST, UTC-5) is 18:37Z
    jest.mocked(paginateGuildMessages).mockImplementation(async function* () {
      // Stands in for the asynchronous database page read
      await Promise.resolve();
      yield { userId: "a", createdAt: "2026-01-14T18:37:00.000Z" } as never;
      // 13:37 in Helsinki is 06:37 in New York: not a leet there
      yield { userId: "b", createdAt: "2026-01-14T11:37:00.000Z" } as never;
      yield { userId: "b", createdAt: "2026-01-15T18:37:00.000Z" } as never;
    });

    const result = await getLeetDaysInRange({
      tableName: "table",
      guildId: GUILD_ID,
      timezone: NEW_YORK,
      fromDate: "2026-01-14",
      toDate: "2026-01-15",
    });

    expect(result).toEqual({
      days: [
        {
          id: `${GUILD_ID}:2026-01-14`,
          date: "2026-01-14",
          participants: [{ userId: "a", leetAt: "2026-01-14T18:37:00.000Z" }],
        },
        {
          id: `${GUILD_ID}:2026-01-15`,
          date: "2026-01-15",
          participants: [{ userId: "b", leetAt: "2026-01-15T18:37:00.000Z" }],
        },
      ],
      hasMore: false,
    });
    expect(paginateGuildMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "2026-01-14T05:00:00.000Z",
        to: "2026-01-16T04:59:59.999Z",
      }),
    );
  });
});
