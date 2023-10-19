import { Message } from "/opt/nodejs/discord";
import { isLeeb, isLeet } from "../util/dateTime";
import { findEmoji } from "../util/emoji";

/**
 * Handles LEET and LEEB messages when they are not sent at the correct time
 * @param message  Message
 */
export const unrelatedHandler = async (message: Message) => {
  // Find LEET emoji
  const leetEmoji = findEmoji(message.guild, "leet");
  const leebEmoji = findEmoji(message.guild, "leeb");

  if (!leetEmoji || !leebEmoji) {
    console.error(
      'Could not find a "leet" or "leeb" emoji. This function will terminate.',
    );
    throw new Error("Could not find emojis");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();

  if (
    content === "leet" ||
    content === leetEmoji.toString() ||
    content === "leeb" ||
    content === leebEmoji.toString()
  ) {
    if (
      !isLeet(message.createdTimestamp) &&
      !isLeeb(message.createdTimestamp)
    ) {
      await message.react("🙄");

      console.info(
        `Reacted to UNRELATED_LEET_OR_LEEB from user ${
          message.author.username
        } at ${new Date(message.createdTimestamp).toLocaleTimeString(
          "fi-FI",
        )}.`,
      );
    }
  }
};
