import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { Message, MessageDbo } from "./types";
import { getDatePrefix, getEndOfDayPrefix } from "@/src/util/dateTime";

const dbClient = getDbClient();

// TODO: Could probably be merged with `getUserMessagesByDate`
export const getUserMessagesByDateRange = async ({
  tableName,
  guildId,
  userId,
  startDate,
  endDate,
}: {
  tableName: string;
  guildId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}): Promise<Message[]> => {
  const pk: MessageDbo["pk2"] = `guild#${guildId}#user#${userId}`;

  // Format date as YYYY-MM-DD
  const startDatePrefix = `createdAt#${getDatePrefix(startDate)}`;
  const endDatePrefix = `createdAt#${getEndOfDayPrefix(endDate)}`;

  const command = new QueryCommand({
    TableName: tableName,
    IndexName: "gsi2",
    KeyConditionExpression:
      "pk2 = :pk AND sk2 BETWEEN :startDatePrefix AND :endDatePrefix",
    ExpressionAttributeValues: {
      ":pk": pk,
      ":startDatePrefix": startDatePrefix,
      ":endDatePrefix": endDatePrefix,
    },
    ProjectionExpression: "messageType, createdAt, userId, guildId, id",
  });

  const response = await dbClient.send(command);

  return (response.Items as Message[]) ?? [];
};
