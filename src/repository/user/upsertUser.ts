import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import type { User, UserDbo } from "./types";

const dbClient = getDbClient();

/**
 * Creates or updates a user in the database
 */
export const upsertUser = ({
  tableName,
  user,
  guildId,
}: {
  tableName: string;
  user: User;
  guildId: string;
}): Promise<PutCommandOutput> => {
  const userDbo: UserDbo = {
    ...user,
    pk1: `user#${user.id}`,
    sk1: `guild#${guildId}`,
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: userDbo,
  });

  return dbClient.send(command);
};
