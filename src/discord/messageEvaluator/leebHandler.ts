import baseLogger from "@logger";
import { isLeeb } from "@/src/util/dateTime";
import { type DiscordMessage, MessageTypes } from "@/src/types";
import { Emoji, Guild } from "@/src/repository/guild/types";
import { hasAlreadyPostedOnDate, saveMessageAndUser } from "./util";
import { createReactionPublisher } from "@/src/discord/messageEvaluator/publishReaction";
import { findEmoji, isCustomDiscordEmoji } from "@/src/discord/utils/emoji";

interface LeebHandlerProps {
  message: DiscordMessage;
  guild: Guild;
  applicationEmojis: Emoji[];
  tableName: string;
  topicArn: string;
  reactionsEnabled: boolean;
  alwaysAllowLeeb?: boolean;
  skipUniquenessCheck?: boolean;
}

const logger = baseLogger.child({ function: "leebHandler" });

/**
 * Handles LEEB messages
 */
export const leebHandler = async ({
  message,
  guild,
  applicationEmojis,
  tableName,
  topicArn,
  reactionsEnabled,
  alwaysAllowLeeb = false,
  skipUniquenessCheck = false,
}: LeebHandlerProps) => {
  logger.info(
    `Processing LEEB from ${message.author.id} created at ${message.createdTimestamp}`,
  );

  const react = createReactionPublisher({
    messageId: message.id,
    channelId: message.channelId,
    topicArn,
    enabled: reactionsEnabled,
  });

  const leebEmoji = findEmoji(guild.emojis, "leeb");

  // Check message content
  const content = message.content.trim().toLowerCase();
  logger.debug({ content }, "leebHandler extracted message content:");

  if (
    !(
      content === "leeb" ||
      (leebEmoji && isCustomDiscordEmoji(content, leebEmoji.identifier))
    )
  ) {
    logger.debug(
      "Message content does not warrant processing the LEEB handler any further. Exiting leeb handler…",
    );
    return;
  }

  // Verify the timestamp
  if (!isLeeb(message.createdTimestamp)) {
    logger.info("Received LEEB with a non-LEEB timestamp.");

    if (alwaysAllowLeeb) {
      logger.info("This is a test event where LEEB is always allowed.");
    } else {
      logger.info("❌ Not allowed.");
      await react("🤡");
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
    await react("😡");
    return;
  }

  logger.debug("Saving message to the database…");

  await saveMessageAndUser({
    message,
    guild,
    messageType: MessageTypes.LEEB,
    tableName,
  });

  await react(findEmoji(applicationEmojis, "leeb")?.identifier ?? "✅");
};
