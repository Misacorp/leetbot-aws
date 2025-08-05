import { isLeeb } from "../util/dateTime";
import { findEmoji } from "../util/emoji";
import type { MessageHandlerProps } from "../../types";
import { isTestEvent } from "../util/lambda";
import { publishToDiscordOutTopic } from "./publishToDiscordOutTopic";

/**
 * Handles LEET messages sent during the 13:38 minute
 * @param message   Message
 * @param event     Lambda event
 */
export const failedLeetHandler = async ({
  message,
  event,
}: MessageHandlerProps) => {
  // Find emojis
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

  if (content === "leet" || content === leetEmoji.toString()) {
    const alwaysAllowFailedLeet =
      isTestEvent(event) && event.alwaysAllowFailedLeet;
    if (!isLeeb(message.createdTimestamp) && !alwaysAllowFailedLeet) {
      return;
    }

    const success = await publishToDiscordOutTopic(message, event);
    if (!success) {
      return;
    }

    // React with the LEEB emoji on success
    await message.react(leebEmoji);

    console.info(
      `Reacted to FAILED_LEET from user ${
        message.author.username
      } at ${new Date(message.createdTimestamp).toLocaleTimeString("fi-FI")}.`,
    );
  }
};
