import { isLeet } from "../util/dateTime";
import { findEmoji } from "../util/emoji";
import type { MessageHandlerProps } from "../types";
import { isTestEvent } from "../util/lambda";
import { publishDiscordMessage } from "./publishDiscordMessage";

/**
 * Handles LEET messages
 * @param message  Message
 * @param event    Lambda event
 */
export const leetHandler = async ({ message, event }: MessageHandlerProps) => {
  // Find LEET emoji
  const leetEmoji = findEmoji(message.guild, "leet");

  if (!leetEmoji) {
    console.error(
      'Could not find a "leet" emoji. This function will terminate.',
    );
    throw new Error("Could not find emoji");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();

  if (content === "leet" || content === leetEmoji.toString()) {
    // Verify the timestamp. A test event can bypass this check.
    const alwaysAllowLeet = isTestEvent(event) && event.alwaysAllowLeet;
    if (!isLeet(message.createdTimestamp) && !alwaysAllowLeet) {
      return;
    }

    const success = await publishDiscordMessage(message, event);
    if (!success) {
      return;
    }

    // React with the LEET emoji on success
    await message.react(leetEmoji);

    console.info(
      `Reacted to LEET from user ${message.author.username} at ${new Date(
        message.createdTimestamp,
      ).toLocaleTimeString("fi-FI")}.`,
    );
  }
};
