import { leetHandler } from "./leetHandler";
import * as emoji from "../util/emoji";
import { Message } from "/opt/nodejs/discord";

const mockMessage: Pick<
  Message,
  "createdTimestamp" | "react" | "guild" | "id" | "author" | "content"
> = {
  createdTimestamp: 1697629060,
  react: jest.fn(),
  guild: {},
  id: "1",
  author: {
    id: "author-id",
    username: "author-username",
  },
  content: "leet",
} as unknown as Message;

describe("leetHandler", () => {
  it("should throw an error when the leet emoji cannot be found", async () => {
    jest.spyOn(emoji, "findEmoji").mockReturnValueOnce(undefined);

    await expect(leetHandler(mockMessage, "mock-queue-url")).rejects.toThrow(
      "Could not find emoji",
    );
  });
});
