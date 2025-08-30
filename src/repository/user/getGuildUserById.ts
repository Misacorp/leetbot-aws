import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { User } from "./types";

const dbClient = getDbClient();

export const getGuildUserById = async ({
  tableName,
  userId,
  guildId,
}: {
  tableName: string;
  userId: string;
  guildId: string;
}): Promise<User | null> => {
  const command = new GetCommand({
    TableName: tableName,
    Key: {
      pk1: `user#${userId}`,
      sk1: `guild#${guildId}`,
    },
    ProjectionExpression: "id, username, displayName, avatarUrl",
  });

  const response = await dbClient.send(command);

  return response.Item as User | null;
};
