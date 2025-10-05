import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import type { CacheEntry } from "./types";
import { getDbClient } from "@/src/repository/util";

const dbClient = getDbClient();

export const createCacheEntry = async ({
  tableName,
  cacheEntry,
}: {
  tableName: string;
  cacheEntry: CacheEntry;
}): Promise<PutCommandOutput> => {
  const command = new PutCommand({
    TableName: tableName,
    Item: cacheEntry,
  });

  return dbClient.send(command);
};
