import { Message, MessageDbo } from "./types";
import { getDatePrefix } from "@/src/util/dateTime";
import { queryAll } from "@/src/repository/queryAll";

export const getUserMessagesByDate = async ({
  tableName,
  guildId,
  userId,
  date,
}: {
  tableName: string;
  guildId: string;
  userId: string;
  date: Date;
}): Promise<Message[]> => {
  const pk: MessageDbo["pk2"] = `guild#${guildId}#user#${userId}`;

  // Format date as YYYY-MM-DD
  const datePrefix = getDatePrefix(date);
  const skPrefix = `createdAt#${datePrefix}`;

  return queryAll<Message>({
    TableName: tableName,
    IndexName: "gsi2",
    KeyConditionExpression: "pk2 = :pk AND begins_with(sk2, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": pk,
      ":skPrefix": skPrefix,
    },
    ProjectionExpression: "messageType, createdAt, userId, guildId, id",
  });
};
