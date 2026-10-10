import type { MessageType } from "@/src/types";
import { paginateQuery } from "@/src/repository/queryAll";
import type { Message, MessageDbo } from "./types";

/**
 * Streams a guild's messages of one type in ascending createdAt order.
 * Pages are read lazily, so stop iterating to stop reading.
 * Both bounds are optional ISO-8601 timestamps and are inclusive.
 */
export async function* paginateGuildMessagesInRange({
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
  const pk: MessageDbo["pk1"] = `guild#${guildId}#messageType#${type}`;

  // "createdAt#" sorts before every real key and "createdAt$" after them all.
  const skFrom = `createdAt#${from ?? ""}`;
  const skTo = to ? `createdAt#${to}` : "createdAt$";

  yield* paginateQuery<Message>({
    TableName: tableName,
    KeyConditionExpression: "pk1 = :pk AND sk1 BETWEEN :from AND :to",
    ExpressionAttributeValues: {
      ":pk": pk,
      ":from": skFrom,
      ":to": skTo,
    },
    ProjectionExpression: "messageType, createdAt, userId, guildId, id",
    ScanIndexForward: true,
  });
}
