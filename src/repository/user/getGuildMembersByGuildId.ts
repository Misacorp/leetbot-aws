import { User } from "./types";
import { queryAll } from "@/src/repository/queryAll";

export const getGuildMembersByGuildId = async ({
  tableName,
  guildId,
}: {
  tableName: string;
  guildId: string;
}): Promise<User[]> =>
  queryAll<User>({
    TableName: tableName,
    KeyConditionExpression: "pk1 = :pk AND begins_with(sk1, :skPrefix)",
    ExpressionAttributeValues: {
      ":pk": `guild#${guildId}`,
      ":skPrefix": "user#",
    },
    ProjectionExpression: "id, username, displayName, avatarUrl",
  });
