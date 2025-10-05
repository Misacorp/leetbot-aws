import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import type { Message, MessageDbo } from "./types";
import { isGameMessage } from "@/src/discord/messageEvaluator/util";

const dbClient = getDbClient();

/**
 * Creates a message in the database.
 */
export const createMessage = async ({
  tableName,
  message,
}: {
  tableName: string;
  message: Message;
}): Promise<PutCommandOutput> => {
  const messageDbo: MessageDbo = {
    ...message,
    pk1: `guild#${message.guildId}#messageType#${message.messageType}`,
    sk1: `createdAt#${message.createdAt}#messageId#${message.id}`,
    pk2: `guild#${message.guildId}#user#${message.userId}`,
    sk2: `createdAt#${message.createdAt}#messageId#${message.id}`,
  };

  // Add speed GSI values only for game messages
  if (isGameMessage(message.messageType)) {
    messageDbo["pk3"] =
      `guild#${message.guildId}#messageType#${message.messageType}`;

    const createdAt = new Date(message.createdAt);
    const speed = (
      createdAt.getUTCSeconds() * 1000 +
      createdAt.getUTCMilliseconds()
    )
      .toString()
      .padStart(5, "0");
    messageDbo["sk3"] =
      `speed#${speed}#createdAt#${message.createdAt}#messageId#${message.id}`;
  }

  const command = new PutCommand({
    TableName: tableName,
    Item: messageDbo,
  });

  return dbClient.send(command);
};
