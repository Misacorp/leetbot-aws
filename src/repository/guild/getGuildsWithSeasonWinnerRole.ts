import { queryAll } from "@/src/repository/queryAll";
import { ALL_GUILDS_PK, createGuildKey } from "./keys";
import { type Guild } from "./types";

export interface GuildWithSeasonWinnerRole
  extends Pick<Guild, "id" | "seasonWinnerRoleId"> {
  seasonWinnerRoleId: string;
}

/**
 * Gets all guilds where a season winner role ID has been defined
 */
export const getGuildsWithSeasonWinnerRole = async ({
  tableName,
}: {
  tableName: string;
}): Promise<GuildWithSeasonWinnerRole[]> =>
  queryAll<GuildWithSeasonWinnerRole>({
    TableName: tableName,
    IndexName: "gsi2",
    KeyConditionExpression: "pk2 = :pk2 AND begins_with(sk2, :skPrefix)",
    FilterExpression: "attribute_exists(seasonWinnerRoleId)",
    ExpressionAttributeValues: {
      ":pk2": ALL_GUILDS_PK,
      ":skPrefix": createGuildKey(""),
    },
    ProjectionExpression: "id, seasonWinnerRoleId",
  });
