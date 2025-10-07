import { DynamoDB, type DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

let dbClient: DynamoDBDocument;

/**
 * Gets a DynamoDB document client, reusing an existing one if possible.
 */
export const getDbClient = (args?: DynamoDBClientConfig) => {
  if (!dbClient) {
    dbClient = DynamoDBDocument.from(new DynamoDB(args ?? {}));
  }

  return dbClient;
};
