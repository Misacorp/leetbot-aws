import type { QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { Message, MessageDbo } from "./types";
import { getDatePrefix, getEndOfDayPrefix } from "@/src/util/dateTime";
import { MessageType } from "@/src/types";
import { paginateQuery, queryAll } from "@/src/repository/queryAll";

/**
 * Builds the query for a guild's messages of one type, in ascending
 * createdAt order. `skFrom` and `skTo` are the full inclusive sort key bounds.
 */
const buildGuildMessagesQuery = ({
  tableName,
  guildId,
  type,
  skFrom,
  skTo,
}: {
  tableName: string;
  guildId: string;
  type: MessageType;
  skFrom: string;
  skTo: string;
}): QueryCommandInput => {
  const pk: MessageDbo["pk1"] = `guild#${guildId}#messageType#${type}`;

  return {
    TableName: tableName,
    KeyConditionExpression: "pk1 = :pk AND sk1 BETWEEN :from AND :to",
    ExpressionAttributeValues: {
      ":pk": pk,
      ":from": skFrom,
      ":to": skTo,
    },
    ProjectionExpression: "messageType, createdAt, userId, guildId, id",
  };
};

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
  // Start-of-day
  startDate: Date;
  // End-of-day
  endDate: Date;
}): Promise<Message[]> => {
  // Format date as YYYY-MM-DD
  const skFrom = `createdAt#${getDatePrefix(startDate)}`;
  const skTo = `createdAt#${getEndOfDayPrefix(endDate)}`;

  return queryAll<Message>(
    buildGuildMessagesQuery({ tableName, guildId, type, skFrom, skTo }),
  );
};

/**
 * Streams a guild's messages of one type in ascending createdAt order.
 * Pages are read lazily, so stop iterating to stop reading.
 * Both bounds are optional ISO-8601 timestamps and are inclusive.
 */
export async function* paginateGuildMessages({
  tableName,
  guildId,
  type,
  from,
  to,
}: {
  tableName: string;
  guildId: string;
  type: MessageType;
  from?: string;
  to?: string;
}): AsyncGenerator<Message, void, unknown> {
  // "createdAt#" sorts before every real key and "createdAt$" after them all.
  const skFrom = `createdAt#${from ?? ""}`;
  const skTo = to ? `createdAt#${to}` : "createdAt$";

  yield* paginateQuery<Message>(
    buildGuildMessagesQuery({ tableName, guildId, type, skFrom, skTo }),
  );
}
