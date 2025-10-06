import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const TABLE_NAME = "YourTableNameHere"; // <-- change this

const client = new DynamoDBClient({
  region: "eu-north-1", // or whatever region you use
});

interface MessageDbo {
  userId: string;
  createdAt: string;
  id: string;
  [key: string]: any;
}

function getDate(iso: string) {
  // Normalize to yyyy-mm-dd
  return iso.split("T")[0];
}

async function findDuplicates() {
  const duplicates: Record<string, MessageDbo[]> = {};
  let lastKey: Record<string, any> | undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        ExclusiveStartKey: lastKey,
      }),
    );

    const items = (result.Items || []).map((i) => unmarshall(i) as MessageDbo);

    for (const msg of items) {
      const date = getDate(msg.createdAt);
      const key = `${msg.userId}#${date}#${msg.id}`;
      duplicates[key] = duplicates[key] || [];
      duplicates[key].push(msg);
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  const dupes = Object.entries(duplicates)
    .filter(([, msgs]) => msgs.length > 1)
    .map(([key, msgs]) => ({
      key,
      count: msgs.length,
      examples: msgs,
    }));

  if (dupes.length === 0) {
    console.log("✅ No duplicate message rows found");
  } else {
    console.log(`⚠️ Found ${dupes.length} duplicate sets:\n`);
    for (const { key, count, examples } of dupes) {
      console.log(`Key: ${key}, Count: ${count}`);
      console.log(
        examples
          .map(
            (m) =>
              `  createdAt=${m.createdAt}, guildId=${m.guildId}, pk1=${m.pk1}`,
          )
          .join("\n"),
      );
      console.log("");
    }
  }
}

findDuplicates().catch((err) => {
  console.error("Error scanning table:", err);
  process.exit(1);
});
