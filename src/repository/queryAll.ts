import { QueryCommand, QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";

const dbClient = getDbClient();

/**
 * Asynchronous generator that paginates through DynamoDB query results.
 * @yields Each item returned from the DynamoDB query
 */
export async function* paginateQuery<T>(
  // Query command input
  input: QueryCommandInput,
  // DynamoDB client to use (optional)
  client: DynamoDBDocumentClient = dbClient,
): AsyncGenerator<T, void, unknown> {
  let lastKey: Record<string, any> | undefined = undefined;

  do {
    const command: QueryCommand = new QueryCommand({
      ...input,
      ExclusiveStartKey: lastKey,
    });

    const response = await client.send(command);

    if (response.Items) {
      for (const item of response.Items as T[]) {
        // Yield each item so the caller can process them one by one.
        yield item;
      }
    }

    lastKey = response.LastEvaluatedKey;
  } while (lastKey);
}

/**
 * Runs a DynamoDB query and ensures all items are fetched.
 * Built-in pagination handling.
 * @returns Promise<T[]> - Array of all items returned from the query.
 */
export const queryAll = async <T>(
  // Query command input
  input: QueryCommandInput,
  // DynamoDB client to use (optional)
  client: DynamoDBDocumentClient = dbClient,
): Promise<T[]> => {
  const items: T[] = [];
  // Iterate over each item yielded by paginateQuery and collect them into an array
  for await (const item of paginateQuery<T>(input, client)) {
    items.push(item);
  }

  // Return the complete list of items after all pages have been fetched
  return items;
};
