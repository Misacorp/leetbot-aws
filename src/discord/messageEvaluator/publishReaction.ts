import type { DiscordReactionCommand } from "@/src/types";
import { publishMessage } from "@/src/util/sns";
import logger from "@logger";

const publishReaction = async ({
  messageId,
  emoji,
  channelId,
  topicArn,
}: {
  messageId: string;
  // Identifier of the emoji to react with, or the emoji itself e.g., 🤔
  emoji: string;
  // Channel ID where the message was posted in
  channelId: string;
  readonly topicArn: string;
}) => {
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

/**
 * Creates a reaction publisher for a single message.
 * Closes over the fixed args (messageId, channelId, topicArn), so call sites
 * can only pass the reaction emoji.
 * Returns a no-op when `enabled` is false.
 */
export const createReactionPublisher =
  ({
    messageId,
    channelId,
    topicArn,
    enabled,
  }: {
    messageId: string;
    channelId: string;
    topicArn: string;
    enabled: boolean;
  }) =>
  (emoji: string): Promise<boolean> => {
    if (!enabled) {
      logger.debug({ emoji }, "Reactions disabled, skipping…");
      return Promise.resolve(false);
    }

    return publishReaction({ messageId, emoji, channelId, topicArn });
  };
