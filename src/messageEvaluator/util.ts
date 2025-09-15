import logger from "@logger";
import { DiscordMessage, MessageType, MessageTypes } from "@/src/types";
import { Guild } from "@/src/repository/guild/types";
import { getUserMessagesByDate } from "@/src/repository/message/getUserMessagesByDate";
import { createMessage } from "@/src/repository/message/createMessage";
import { upsertUser } from "@/src/repository/user/upsertUser";

/**
 * Determines if a message type is related to the "Leet Game".
 * @param messageType Message type
 */
export const isGameMessage = (
  messageType: MessageType,
): messageType is "leet" | "leeb" | "failed_leet" => {
  return (
    messageType === MessageTypes.LEET ||
    messageType === MessageTypes.LEEB ||
    messageType === MessageTypes.FAILED_LEET
  );
};

/**
 * Determines if a given user has already posted a game message on the given date.
 * Does not count non-game-related messages that may exist.
 */
export const hasAlreadyPostedOnDate = async ({
  tableName,
  guildId,
  userId,
  // Message creation timestamp
  createdTimestamp,
}: {
  tableName: string;
  guildId: string;
  userId: string;
  createdTimestamp: number;
}): Promise<boolean> => {
  const existingMessages = await getUserMessagesByDate({
    tableName,
    guildId,
    userId,
    date: new Date(createdTimestamp),
  });

  return existingMessages.some((message) => isGameMessage(message.messageType));
};

/**
 * Saves a given message and its author's data to the database.
 */
export const saveMessageAndUser = async ({
  message,
  guild,
  // Message type e.g., LEET, LEEB, OTHER
  messageType,
  tableName,
}: {
  message: DiscordMessage;
  guild: Guild;
  messageType: MessageType;
  tableName: string;
}) => {
  const [messageResult, userResult] = await Promise.allSettled([
    createMessage({
      tableName,
      message: {
        messageType,
        createdAt: new Date(message.createdTimestamp).toISOString(),
        guildId: guild.id,
        id: message.id,
        userId: message.author.id,
      },
    }),
    upsertUser({
      tableName,
      user: {
        id: message.author.id,
        username: message.author.username,
        avatarUrl: message.member?.avatarUrl ?? message.author.avatarUrl,
        displayName: message.member?.displayName ?? null,
      },
      guildId: guild.id,
    }),
  ]);

  if (messageResult.status === "rejected") {
    throw new Error(`Failed to create message: ${messageResult.reason}`);
  }

  if (userResult.status === "rejected") {
    logger.warn("Failed to upsert user:", userResult.reason);
  }

  logger.info(
    `✅Saved ${messageType.toUpperCase()} from user ${message.author.username} at ${new Date(
      message.createdTimestamp,
    ).toLocaleTimeString("fi-FI")}.`,
  );
};
