import { PutCommand, type PutCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { ApplicationConfig, ApplicationConfigDbo } from "./types";

const dbClient = getDbClient();

export const upsertApplicationConfig = ({
  tableName,
  config,
}: {
  tableName: string;
  config: ApplicationConfig;
}): Promise<PutCommandOutput> => {
  const item: ApplicationConfigDbo = {
    ...config,
    pk1: "application#metadata",
    sk1: "metadata",
  };

  return dbClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    }),
  );
};
