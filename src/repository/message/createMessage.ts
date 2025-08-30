import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import type { Message, MessageDbo } from "./types";

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
    pk1: `user#${message.userId}`,
    sk1: `createdAt#${message.createdAt}`,
    pk2: `guild#${message.guildId}`,
    sk2: `messageType#${message.messageType}`,
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: messageDbo,
  });

  return dbClient.send(command);
};
