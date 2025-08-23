import { getUserMessagesByDate } from "@/src/repository/message/getUserMessagesByDate";
import { MessageType, MessageTypes } from "@/src/types";

/**
 * Determines if a message type is related to the "Leet Game".
 * @param messageType Message type
 */
const isGameMessage = (
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
 * @param userId User id
 * @param createdTimestamp Message creation timestamp
 */
export const hasAlreadyPostedOnDate = async (
  userId: string,
  createdTimestamp: number,
): Promise<boolean> => {
  const existingMessages = await getUserMessagesByDate(
    userId,
    new Date(createdTimestamp),
  );

  return existingMessages.some((message) => isGameMessage(message.messageType));
};
