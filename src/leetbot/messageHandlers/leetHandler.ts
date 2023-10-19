import { Message } from "/opt/nodejs/discord";
import { isLeet } from "../util/dateTime";
import { findEmoji } from "../util/emoji";
import { sendMessage } from "../util/sqs";

/**
 * Handles LEET messages
 * @param message   Message
 * @param queueUrl  SQS queue URL to which messages will be sent
 */
export const leetHandler = async (
  message: Pick<
    Message,
    "createdTimestamp" | "react" | "guild" | "id" | "author" | "content"
  >,
  queueUrl: string,
) => {
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
    if (!isLeet(message.createdTimestamp)) {
      return;
    }

    // Send the message forward
    const success = await sendMessage({
      MessageBody: JSON.stringify(message),
      QueueUrl: queueUrl,
      MessageDeduplicationId: message.id,
      MessageGroupId: message.author.id,
    });

    // React with a warning emoji if SQS sending failed
    if (!success) {
      await message.react("⚠️");
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
