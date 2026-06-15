import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { ApplicationConfig } from "./types";

const dbClient = getDbClient();

export const getApplicationConfig = async ({
  tableName,
}: {
  tableName: string;
}): Promise<ApplicationConfig | null> => {
  const response = await dbClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk1: "application#metadata",
        sk1: "metadata",
      },
      ProjectionExpression: "emojis",
    }),
  );

  return (response.Item as ApplicationConfig) ?? null;
};
