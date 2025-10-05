import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { CacheEntry } from "./types";

const dbClient = getDbClient();

export const getCacheEntry = async ({
  tableName,
  id,
}: {
  tableName: string;
  id: string;
}): Promise<CacheEntry | null> => {
  const command = new GetCommand({
    TableName: tableName,
    Key: { id },
  });

  const response = await dbClient.send(command);

  return response.Item as CacheEntry | null;
};
