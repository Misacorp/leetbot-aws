import { Message } from "/opt/nodejs/discord";
import { isLeeb } from "../util/dateTime";
import { findEmoji } from "../util/emoji";
import { sendMessage } from "../util/sqs";

/**
 * Handles LEET messages sent during the 13:38 minute
 * @param message   Message
 * @param queueUrl  SQS queue URL to which messages will be sent
 */
export const failedLeetHandler = async (message: Message, queueUrl: string) => {
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
    // A FAILED_LEET is a LEET during the 13:38 minute
    if (isLeeb(message.createdTimestamp)) {
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

      // React with the LEEB emoji on success
      await message.react(leebEmoji);

      console.info(
        `Reacted to FAILED_LEET from user ${
          message.author.username
        } at ${new Date(message.createdTimestamp).toLocaleTimeString(
          "fi-FI",
        )}.`,
      );
    }
  }
};
