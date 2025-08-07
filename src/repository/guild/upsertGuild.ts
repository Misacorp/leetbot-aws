import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "../util";
import type { Guild, GuildDbo } from "./types";

const dbClient = getDbClient();

/**
 * Creates or updates a guild in the database
 */
export const upsertGuild = (guild: Guild): Promise<PutCommandOutput> => {
  const guildDbo: GuildDbo = {
    ...guild,
    pk1: `guild#${guild.id}`,
    sk1: "metadata",
  };

  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: guildDbo,
  });

  return dbClient.send(command);
};
