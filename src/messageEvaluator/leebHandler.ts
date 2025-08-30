import baseLogger from "@logger";
import { isLeeb } from "@/src/util/dateTime";
import { findEmoji } from "@/src/util/emoji";
import { type DiscordMessage, MessageTypes } from "@/src/types";
import { Guild } from "@/src/repository/guild/types";
import { hasAlreadyPostedOnDate, saveMessageAndUser } from "./util";

interface LeebHandlerProps {
  message: DiscordMessage;
  guild: Guild;
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
  alwaysAllowLeeb = false,
  skipUniquenessCheck = false,
}: LeebHandlerProps) => {
  logger.info(
    `Processing LEEB from ${message.author.id} created at ${message.createdTimestamp}`,
  );

  // Find LEEB emoji
  const leebEmoji = findEmoji(guild, "leeb");
  if (!leebEmoji) {
    throw new Error("Could not find 'leeb' emoji");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();
  logger.debug({ content }, "leebHandler extracted message content:");

  if (!(content === "leeb" || content.includes(leebEmoji.identifier))) {
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
      logger.info("❌ Not allowed. Exiting leeb handler…");
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
      `❌️The user has already posted a game message today. Exiting leeb handler…`,
    );
    return;
  }

  logger.debug("Saving message to the database…");

  // Save message and user information
  await saveMessageAndUser(message, guild, MessageTypes.LEEB);
};
