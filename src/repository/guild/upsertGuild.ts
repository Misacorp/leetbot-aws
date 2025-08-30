import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import type { Guild, GuildDbo } from "./types";

const dbClient = getDbClient();

/**
 * Creates or updates a guild in the database
 */
export const upsertGuild = ({
  tableName,
  guild,
}: {
  tableName: string;
  guild: Guild;
}): Promise<PutCommandOutput> => {
  const guildDbo: GuildDbo = {
    ...guild,
    pk1: `guild#${guild.id}`,
    sk1: "metadata",
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: guildDbo,
  });

  return dbClient.send(command);
};
