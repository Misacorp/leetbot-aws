import { getTopUserIdsFromSortedMessageCounts } from "./getTopUserIdsFromSortedMessageCounts";

describe("getTopUserIdsFromSortedMessageCounts", () => {
  it("returns a unique winner", () => {
    expect(
      getTopUserIdsFromSortedMessageCounts([
        { userId: "user-1", messageCount: 5 },
        { userId: "user-2", messageCount: 3 },
      ]),
    ).toEqual(["user-1"]);
  });

  it("returns all tied winners", () => {
    expect(
      getTopUserIdsFromSortedMessageCounts([
        { userId: "user-1", messageCount: 5 },
        { userId: "user-2", messageCount: 5 },
        { userId: "user-3", messageCount: 1 },
      ]),
    ).toEqual(["user-1", "user-2"]);
  });

  it("returns an empty list when no messages exist", () => {
    expect(getTopUserIdsFromSortedMessageCounts([])).toEqual([]);
  });
});
