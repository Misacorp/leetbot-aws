import { queryAll } from "@/src/repository/queryAll";
import { ALL_GUILDS_PK, createGuildKey } from "./keys";
import { type Guild } from "./types";

export interface GuildWithRecapChannel extends Pick<Guild, "id" | "recapChannelId"> {
  recapChannelId: string;
}

/**
 * Gets all guilds that have a recap channel configured.
 */
export const getGuildsWithRecapChannel = async ({
  tableName,
}: {
  tableName: string;
}): Promise<GuildWithRecapChannel[]> =>
  queryAll<GuildWithRecapChannel>({
    TableName: tableName,
    IndexName: "gsi2",
    KeyConditionExpression: "pk2 = :pk2 AND begins_with(sk2, :skPrefix)",
    FilterExpression: "attribute_exists(recapChannelId)",
    ExpressionAttributeValues: {
      ":pk2": ALL_GUILDS_PK,
      ":skPrefix": createGuildKey(""),
    },
    ProjectionExpression: "id, recapChannelId",
  });
