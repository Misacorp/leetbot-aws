import type { Message } from "@/src/repository/message/types";
import { countAndSortMessagesByUser } from "@/src/discord/stats/messageCounts";
import { MessageTypes } from "@/src/types";

const createMessage = (id: string, userId: string): Message => ({
  id,
  userId,
  guildId: "guild-1",
  createdAt: "2026-04-30T10:37:00.000Z",
  messageType: MessageTypes.LEET,
});

describe("messageCounts", () => {
  describe("countAndSortMessagesByUser", () => {
    it("counts messages per user and sorts descending", () => {
      const counts = countAndSortMessagesByUser([
        createMessage("1", "user-b"),
        createMessage("2", "user-a"),
        createMessage("3", "user-a"),
        createMessage("4", "user-c"),
        createMessage("5", "user-c"),
        createMessage("6", "user-c"),
      ]);

      expect(counts).toEqual([
        { userId: "user-c", messageCount: 3 },
        { userId: "user-a", messageCount: 2 },
        { userId: "user-b", messageCount: 1 },
      ]);
    });

    it("breaks ties deterministically by user id", () => {
      const counts = countAndSortMessagesByUser([
        createMessage("1", "user-b"),
        createMessage("2", "user-a"),
      ]);

      expect(counts).toEqual([
        { userId: "user-a", messageCount: 1 },
        { userId: "user-b", messageCount: 1 },
      ]);
    });
  });
});
