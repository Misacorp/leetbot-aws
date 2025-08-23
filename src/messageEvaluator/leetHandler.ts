import { isLeet } from "../util/dateTime";
import { findEmoji } from "../util/emoji";
import { type DiscordMessage, MessageTypes } from "../types";
import { Guild } from "../repository/guild/types";
import { createMessage } from "../repository/message/createMessage";
import { upsertUser } from "../repository/user/upsertUser";
import { hasAlreadyPostedOnDate } from "./util";

interface LeetHandlerProps {
  message: DiscordMessage;
  guild: Guild;
  alwaysAllowLeet?: boolean;
}

/**
 * Handles LEET messages
 */
export const leetHandler = async ({
  message,
  guild,
  alwaysAllowLeet = false,
}: LeetHandlerProps) => {
  // Find LEET emoji
  const leetEmoji = findEmoji(guild, "leet");

  if (!leetEmoji) {
    throw new Error("Could not find 'leet' emoji");
  }

  // Check message content
  const content = message.content.trim().toLowerCase();
  console.debug("leetHandler extracted message content:", content);

  if (!(content === "leet" || content.includes(leetEmoji.identifier))) {
    console.debug(
      "Message content does not warrant processing the LEET handler any further. Exiting leet handler…",
    );
    return;
  }

  // Verify the timestamp
  if (!isLeet(message.createdTimestamp)) {
    console.info("Received LEET with a non-LEET timestamp.");

    if (alwaysAllowLeet) {
      console.info("This is a test event where LEET is always allowed.");
    } else {
      console.info("❌ Not allowed. Exiting leet handler…");
      return;
    }
  }

  // Check if the user has already posted a message today
  if (
    await hasAlreadyPostedOnDate(message.author.id, message.createdTimestamp)
  ) {
    console.info(
      `❌️The user has already posted a game message today. Exiting leet handler…`,
    );
    return;
  }

  console.debug("Saving message to the database…");

  // Save message and user information
  const [messageResult, userResult] = await Promise.allSettled([
    createMessage({
      messageType: MessageTypes.LEET,
      createdAt: new Date(message.createdTimestamp).toISOString(),
      guildId: guild.id,
      id: message.id,
      userId: message.author.id,
    }),
    upsertUser(
      {
        id: message.author.id,
        username: message.author.username,
        avatarUrl: message.member?.avatarUrl ?? message.author.avatarUrl,
        displayName: message.member?.displayName ?? null,
      },
      guild.id,
    ),
  ]);

  if (messageResult.status === "rejected") {
    throw new Error(`Failed to create message: ${messageResult.reason}`);
  }

  if (userResult.status === "rejected") {
    console.warn("Failed to upsert user:", userResult.reason);
  }

  console.info(
    `✅Saved LEET from user ${message.author.username} at ${new Date(
      message.createdTimestamp,
    ).toLocaleTimeString("fi-FI")}.`,
  );
};
