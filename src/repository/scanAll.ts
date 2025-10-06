import { ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";

const dbClient = getDbClient();

/**
 * Asynchronous generator that paginates through DynamoDB scan results.
 * @yields Each item returned from the DynamoDB scan
 */
export async function* paginateScan<T>(
  // Scan command input
  input: ScanCommandInput,
  // DynamoDB client to use (optional)
  client: DynamoDBDocumentClient = dbClient,
): AsyncGenerator<T, void, unknown> {
  let lastKey: Record<string, any> | undefined = undefined;

  do {
    const command: ScanCommand = new ScanCommand({
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
 * Runs a DynamoDB scan and ensures all items are fetched.
 * Built-in pagination handling.
 * @returns Promise<T[]> - Array of all items returned from the scan.
 */
export const scanAll = async <T>(
  // Scan command input
  input: ScanCommandInput,
  // DynamoDB client to use (optional)
  client: DynamoDBDocumentClient = dbClient,
): Promise<T[]> => {
  const items: T[] = [];
  // Iterate over each item yielded by paginateScan and collect them into an array
  for await (const item of paginateScan<T>(input, client)) {
    items.push(item);
  }

  // Return the complete list of items after all pages have been fetched
  return items;
};
