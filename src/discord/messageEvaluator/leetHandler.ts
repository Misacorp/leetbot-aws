import baseLogger from "@logger";
import { isLeet } from "@/src/util/dateTime";
import { findEmoji } from "@/src/util/emoji";
import { type DiscordMessage, MessageTypes } from "@/src/types";
import { Guild } from "@/src/repository/guild/types";
import { hasAlreadyPostedOnDate, saveMessageAndUser } from "./util";
import { publishReaction } from "@/src/discord/messageEvaluator/publishReaction";

interface LeetHandlerProps {
  message: DiscordMessage;
  guild: Guild;
  tableName: string;
  topicArn: string;
  alwaysAllowLeet?: boolean;
  skipUniquenessCheck?: boolean;
}

const logger = baseLogger.child({ function: "leetHandler" });

/**
 * Handles LEET messages
 */
export const leetHandler = async ({
  message,
  guild,
  tableName,
  topicArn,
  alwaysAllowLeet = false,
  skipUniquenessCheck = false,
}: LeetHandlerProps) => {
  logger.info(
    `Processing LEET from ${message.author.id} created at ${message.createdTimestamp}`,
  );

  // Find LEET emoji
  const leetEmoji = findEmoji(guild, "leet");
  if (!leetEmoji) {
    throw new Error("Could not find 'leet' emoji");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();
  logger.debug({ content }, "leetHandler extracted message content:");

  if (!(content === "leet" || content === leetEmoji.identifier)) {
    logger.debug(
      "Message content does not warrant processing the LEET handler any further. Exiting leet handler…",
    );
    return;
  }

  // Verify the timestamp
  if (!isLeet(message.createdTimestamp)) {
    logger.info("Received LEET with a non-LEET timestamp.");

    if (alwaysAllowLeet) {
      logger.info("This is a test event where LEET is always allowed.");
    } else {
      logger.info("❌ Not allowed.");

      await publishReaction({
        messageId: message.id,
        emoji: "🤡",
        channelId: message.channelId,
        topicArn,
      });

      return;
    }
  }

  // Check if the user has already posted a message today
  if (skipUniquenessCheck) {
    logger.info("Skipping uniqueness check…");
  } else if (
    await hasAlreadyPostedOnDate({
      guildId: guild.id,
      userId: message.author.id,
      createdTimestamp: message.createdTimestamp,
      tableName,
    })
  ) {
    logger.info(`❌️The user has already posted a game message today.`);

    await publishReaction({
      messageId: message.id,
      emoji: "😡",
      channelId: message.channelId,
      topicArn,
    });

    return;
  }

  logger.debug("Saving message to the database…");

  await saveMessageAndUser({
    message,
    guild,
    messageType: MessageTypes.LEET,
    tableName,
  });

  await publishReaction({
    messageId: message.id,
    emoji: leetEmoji.identifier,
    channelId: message.channelId,
    topicArn,
  });
};
