import type { DiscordReactionCommand } from "@/src/types";
import { publishMessage } from "@/src/util/sns";
import logger from "@logger";

interface Props {
  messageId: string;
  // Identifier of the emoji to react with, or the emoji itself e.g., 🤔
  emoji: string;
  // Channel ID where the message was posted in
  channelId: string;
  readonly topicArn: string;
}

/**
 * Sends a command to react to a message to an SNS topic
 */
export const publishReaction = async ({
  messageId,
  emoji,
  channelId,
  topicArn,
}: Props) => {
  const payload: DiscordReactionCommand = {
    messageId,
    emoji,
    channelId,
  };

  logger.debug({ payload }, "Publishing reaction to SNS…");

  const success = await publishMessage({
    TopicArn: topicArn,
    Message: JSON.stringify(payload),
  });

  return Boolean(success);
};
