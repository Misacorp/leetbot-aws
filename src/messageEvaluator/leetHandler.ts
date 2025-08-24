import baseLogger from "@logger";
import { isLeet } from "@/src/util/dateTime";
import { findEmoji } from "@/src/util/emoji";
import { type DiscordMessage, MessageTypes } from "@/src/types";
import { Guild } from "@/src/repository/guild/types";
import { hasAlreadyPostedOnDate, saveMessageAndUser } from "./util";

interface LeetHandlerProps {
  message: DiscordMessage;
  guild: Guild;
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
  alwaysAllowLeet = false,
  skipUniquenessCheck = false,
}: LeetHandlerProps) => {
  // Find LEET emoji
  const leetEmoji = findEmoji(guild, "leet");
  if (!leetEmoji) {
    throw new Error("Could not find 'leet' emoji");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();
  logger.debug({ content }, "leetHandler extracted message content:");

  if (!(content === "leet" || content.includes(leetEmoji.identifier))) {
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
      logger.info("❌ Not allowed. Exiting leet handler…");
      return;
    }
  }

  // Check if the user has already posted a message today
  if (skipUniquenessCheck) {
    console.info("Skipping uniqueness check…");
  } else if (
    await hasAlreadyPostedOnDate(message.author.id, message.createdTimestamp)
  ) {
    logger.info(
      `❌️The user has already posted a game message today. Exiting leet handler…`,
    );
    return;
  }

  logger.debug("Saving message to the database…");

  await saveMessageAndUser(message, guild, MessageTypes.LEET);
};
