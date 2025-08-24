import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { Message } from "./types";
import { getDatePrefix } from "@/src/util/dateTime";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
    }
  }
}

const dbClient = getDbClient();

export const getUserMessagesByDate = async (
  userId: string,
  date: Date,
): Promise<Message[]> => {
  // Format date as YYYY-MM-DD
  const datePrefix = getDatePrefix(date);

  const command = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "pk1 = :pk1 AND begins_with(sk1, :sk1Prefix)",
    ExpressionAttributeValues: {
      ":pk1": `user#${userId}`,
      ":sk1Prefix": `createdAt#${datePrefix}`,
    },
    ProjectionExpression: "messageType, createdAt, userId, guildId, id",
  });

  const response = await dbClient.send(command);

  return (response.Items as Message[]) ?? [];
};
