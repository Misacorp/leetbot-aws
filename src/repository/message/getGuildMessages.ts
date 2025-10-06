import { Message, MessageDbo } from "./types";
import { getDatePrefix } from "@/src/util/dateTime";
import { MessageType } from "@/src/types";
import { queryAll } from "@/src/repository/queryAll";

export const getGuildMessages = async ({
  tableName,
  guildId,
  type,
  startDate,
  endDate,
}: {
  tableName: string;
  guildId: string;
  type: MessageType;
  startDate: Date;
  endDate: Date;
}): Promise<Message[]> => {
  const pk: MessageDbo["pk1"] = `guild#${guildId}#messageType#${type}`;

  // Format date as YYYY-MM-DD
  const skFrom = `createdAt#${getDatePrefix(startDate)}`;
  const skTo = `createdAt#${getDatePrefix(endDate)}`;

  return queryAll<Message>({
    TableName: tableName,
    KeyConditionExpression: "pk1 = :pk AND sk1 BETWEEN :from AND :to",
    ExpressionAttributeValues: {
      ":pk": pk,
      ":from": skFrom,
      ":to": skTo,
    },
    ProjectionExpression: "messageType, createdAt, userId, guildId, id",
  });
};
