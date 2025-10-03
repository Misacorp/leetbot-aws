import baseLogger from "@logger";
import { isLeeb } from "@/src/util/dateTime";
import { findEmoji } from "@/src/util/emoji";
import { type DiscordMessage, MessageTypes } from "@/src/types";
import { Guild } from "@/src/repository/guild/types";
import { hasAlreadyPostedOnDate, saveMessageAndUser } from "./util";
import { publishReaction } from "@/src/discord/messageEvaluator/publishReaction";

interface FailedLeetHandlerProps {
  message: DiscordMessage;
  guild: Guild;
  tableName: string;
  topicArn: string;
  alwaysAllowFailedLeet?: boolean;
  skipUniquenessCheck?: boolean;
}

const logger = baseLogger.child({ function: "failedLeetHandler" });

/**
 * Handles FAILED_LEET messages.
 * I.e., when users post "leet" during LEEB time.
 */
export const failedLeetHandler = async ({
  message,
  guild,
  tableName,
  topicArn,
  alwaysAllowFailedLeet = false,
  skipUniquenessCheck = false,
}: FailedLeetHandlerProps) => {
  logger.info(
    `Processing FAILED_LEET from ${message.author.id} created at ${message.createdTimestamp}`,
  );

  // Find emojis
  const leetEmoji = findEmoji(guild, "leet");
  const leebEmoji = findEmoji(guild, "leeb");
  const failedLeetEmoji = findEmoji(guild, "failed_leet");
  if (!leetEmoji || !leebEmoji || !failedLeetEmoji) {
    throw new Error("Could not find game emojis");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();
  logger.debug({ content }, "failedLeetHandler extracted message content:");

  if (!(content === "leet" || content.includes(leetEmoji.identifier))) {
    logger.debug(
      "Message content does not contain 'leet'. Exiting failed leet handler…",
    );
    return;
  }

  // Verify the timestamp - must be LEEB time (not LEET time)
  if (!isLeeb(message.createdTimestamp)) {
    logger.debug("Received 'leet' content but not during LEEB timestamp.");

    if (alwaysAllowFailedLeet) {
      logger.info("This is a test event where FAILED_LEET is always allowed.");
    } else {
      logger.debug("❌ Not LEEB time. Exiting failed leet handler…");
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

  logger.debug("Saving FAILED_LEET message to the database…");

  await saveMessageAndUser({
    tableName,
    message,
    guild,
    messageType: MessageTypes.FAILED_LEET,
  });

  await publishReaction({
    messageId: message.id,
    emoji: failedLeetEmoji.identifier,
    channelId: message.channelId,
    topicArn,
  });
};
