import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { User } from "./types";

const dbClient = getDbClient();

export const getGuildMembersByGuildId = async ({
  tableName,
  guildId,
}: {
  tableName: string;
  guildId: string;
}): Promise<User[]> => {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "pk1 = :pk AND begins_with(sk1, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `guild#${guildId}`,
      ":skPrefix": "user#",
    },
    ProjectionExpression: "id, username, displayName, avatarUrl",
  });

  const response = await dbClient.send(command);

  return (response.Items as User[]) ?? [];
};
