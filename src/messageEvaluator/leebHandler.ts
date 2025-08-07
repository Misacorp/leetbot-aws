import { findEmoji } from "../util/emoji";
import { isLeeb } from "../util/dateTime";
import type { MessageHandlerProps } from "../types";
import { isTestEvent } from "../util/lambda";
import { publishDiscordMessage } from "./publishDiscordMessage";

/**
 * Handles LEEB messages
 * @param message   Message
 * @param queueUrl  SQS queue URL to which messages will be sent
 * @param event     Lambda event
 */
export const leebHandler = async ({ message, event }: MessageHandlerProps) => {
  // Find LEEB emoji
  const leebEmoji = findEmoji(message.guild, "leeb");

  if (!leebEmoji) {
    console.error(
      'Could not find a "leeb" emoji. This function will terminate.',
    );
    throw new Error("Could not find emoji");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();

  if (content === "leeb" || content === leebEmoji.toString()) {
    // Verify the timestamp. A test event can bypass this check.
    const alwaysAllowLeeb = isTestEvent(event) && event.alwaysAllowLeeb;
    if (!isLeeb(message.createdTimestamp) && !alwaysAllowLeeb) {
      return;
    }

    const success = await publishDiscordMessage(message, event);
    if (!success) {
      return;
    }

    // React with the LEEB emoji on success
    await message.react(leebEmoji);

    console.info(
      `Reacted to LEEB from user ${message.author.username} at ${new Date(
        message.createdTimestamp,
      ).toLocaleTimeString("fi-FI")}.`,
    );
  }
};
