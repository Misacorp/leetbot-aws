import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import type { Message, MessageDbo } from "./types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
    }
  }
}

const dbClient = getDbClient();

/**
 * Creates a message in the database
 */
export const createMessage = async (
  message: Message,
): Promise<PutCommandOutput> => {
  const messageDbo: MessageDbo = {
    ...message,
    pk1: `user#${message.userId}`,
    sk1: `createdAt#${message.createdAt}`,
    pk2: `guild#${message.guildId}`,
    sk2: `messageType#${message.messageType}`,
  };

  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: messageDbo,
  });

  return dbClient.send(command);
};
