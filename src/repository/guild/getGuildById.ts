import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { createGuildKey } from "./keys";
import { Guild } from "./types";

const dbClient = getDbClient();

export const getGuildById = async ({
  tableName,
  id,
}: {
  tableName: string;
  id: string;
}): Promise<Guild | null> => {
  const command = new GetCommand({
    TableName: tableName,
    Key: {
      pk1: createGuildKey(id),
      sk1: "metadata",
    },
    ProjectionExpression: "id, #name, iconUrl, emojis, seasonWinnerRoleId",
    ExpressionAttributeNames: {
      "#name": "name",
    },
  });

  const response = await dbClient.send(command);

  return response.Item as Guild | null;
};
