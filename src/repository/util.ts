import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

let dbClient: DynamoDBDocument;

/**
 * Gets a DynamoDB document client, reusing an existing one if possible.
 */
export const getDbClient = () => {
  if (!dbClient) {
    dbClient = DynamoDBDocument.from(new DynamoDB({}));
  }

  return dbClient;
};
