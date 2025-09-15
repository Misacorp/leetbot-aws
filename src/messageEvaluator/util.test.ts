import { getUserMessagesByDate } from "@/src/repository/message/getUserMessagesByDate";
import { MessageTypes } from "@/src/types";
import { hasAlreadyPostedOnDate } from "./util";

// Mock the getUserMessagesByDate function
jest.mock("@/src/repository/message/getUserMessagesByDate");
const mockGetUserMessagesByDate = getUserMessagesByDate as jest.MockedFunction<
  typeof getUserMessagesByDate
>;

describe("messageEvaluator > util", () => {
  describe("hasAlreadyPostedOnDate", () => {
    const tableName = "test-table";
    const userId = "user123";
    const timestamp = new Date("2024-01-15T13:37:00.000Z").getTime();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe("when user has already posted a game message", () => {
      it("should return true when user has posted a LEET message", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.LEET,
            createdAt: "2024-01-15T13:37:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(true);
        expect(mockGetUserMessagesByDate).toHaveBeenCalledWith({
          tableName,
          guildId: "guild1",
          userId,
          date: new Date(timestamp),
        });
      });

      it("should return true when user has posted a LEEB message", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.LEEB,
            createdAt: "2024-01-15T10:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(true);
      });

      it("should return true when user has posted a FAILED_LEET message", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.FAILED_LEET,
            createdAt: "2024-01-15T14:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(true);
      });

      it("should return true when user has posted multiple game messages", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.LEET,
            createdAt: "2024-01-15T13:37:00.000Z",
            userId,
            guildId: "guild1",
          },
          {
            id: "msg2",
            messageType: MessageTypes.LEEB,
            createdAt: "2024-01-15T14:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(true);
      });
    });

    describe("when user has not posted any game messages", () => {
      it("should return false when no messages exist", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(false);
      });

      it("should return false when only OTHER messages exist", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.OTHER,
            createdAt: "2024-01-15T10:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(false);
      });

      it("should return false when only TEST messages exist", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.TEST,
            createdAt: "2024-01-15T10:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(false);
      });

      it("should return false when mixed non-game messages exist", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.OTHER,
            createdAt: "2024-01-15T10:00:00.000Z",
            userId,
            guildId: "guild1",
          },
          {
            id: "msg2",
            messageType: MessageTypes.TEST,
            createdAt: "2024-01-15T11:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(false);
      });
    });

    describe("mixed message scenarios", () => {
      it("should return true when game messages are mixed with non-game messages", async () => {
        mockGetUserMessagesByDate.mockResolvedValue([
          {
            id: "msg1",
            messageType: MessageTypes.OTHER,
            createdAt: "2024-01-15T10:00:00.000Z",
            userId,
            guildId: "guild1",
          },
          {
            id: "msg2",
            messageType: MessageTypes.LEET,
            createdAt: "2024-01-15T13:37:00.000Z",
            userId,
            guildId: "guild1",
          },
          {
            id: "msg3",
            messageType: MessageTypes.TEST,
            createdAt: "2024-01-15T15:00:00.000Z",
            userId,
            guildId: "guild1",
          },
        ]);

        const result = await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: timestamp,
        });

        expect(result).toBe(true);
      });
    });

    describe("date handling", () => {
      it("should pass the correct date to getUserMessagesByDate", async () => {
        const specificTimestamp = new Date(
          "2024-03-20T08:15:30.500Z",
        ).getTime();
        mockGetUserMessagesByDate.mockResolvedValue([]);

        await hasAlreadyPostedOnDate({
          tableName,
          guildId: "guild1",
          userId,
          createdTimestamp: specificTimestamp,
        });

        expect(mockGetUserMessagesByDate).toHaveBeenCalledWith({
          tableName,
          guildId: "guild1",
          userId,
          date: new Date(specificTimestamp),
        });
      });
    });
  });
});
