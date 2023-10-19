import { Message } from "/opt/nodejs/discord";
import { findEmoji } from "../util/emoji";
import { sendMessage } from "../util/sqs";
import { isLeeb } from "../util/dateTime";

/**
 * Handles LEEB messages
 * @param message   Message
 * @param queueUrl  SQS queue URL to which messages will be sent
 */
export const leebHandler = async (message: Message, queueUrl: string) => {
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
    if (!isLeeb(message.createdTimestamp)) {
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

    // React with the LEEB emoji on success
    await message.react(leebEmoji);

    console.info(
      `Reacted to LEEB from user ${message.author.username} at ${new Date(
        message.createdTimestamp,
      ).toLocaleTimeString("fi-FI")}.`,
    );
  }
};
