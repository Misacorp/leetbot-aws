import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { ALL_GUILDS_PK, createGuildKey } from "./keys";
import { type Guild, type GuildDbo } from "./types";

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
  const guildKey = createGuildKey(guild.id);
  const guildDbo: GuildDbo = {
    ...guild,
    pk1: guildKey,
    sk1: "metadata",
    pk2: ALL_GUILDS_PK,
    sk2: guildKey,
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: guildDbo,
  });

  return dbClient.send(command);
};
