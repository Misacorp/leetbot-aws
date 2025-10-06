/**
 * Finds duplicate messages in DynamoDB (multiple rows for the same Discord messageId).
 * Presents the option to delete the duplicates.
 *
 * GOAL: Ensure each user only has one game message per day.
 */
import { MessageDbo } from "@/src/repository/message/types";
import { scanAll } from "@/src/repository/scanAll";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getDbClient } from "@/src/repository/util";
import { getTableNameFromCdkOutputs } from "@/scripts/getTableNameFromCdkOutputs";

const dbClient = getDbClient();

const env = process.env.ENVIRONMENT;
if (!env) {
  throw new Error(
    "ENVIRONMENT is not defined. Run the command with something like ENVIRONMENT=dev aws-vault exec leetbot-dev -- ts-node scripts/findDuplicateMessages.ts",
  );
}

const TABLE_NAME = getTableNameFromCdkOutputs(env);
console.log("TABLE_NAME:", TABLE_NAME);

const GUILD_ID = "215386000132669440";

const messagePriority = {
  leet: 3,
  leeb: 2,
  failed_leet: 1,
  other: 0,
  test: -1,
};

async function confirm(prompt: string) {
  const rl = readline.createInterface({ input, output });
  const answer = (await rl.question(`${prompt} (y/N): `)).trim().toLowerCase();
  rl.close();
  return answer === "y";
}

async function cleanupDuplicates(
  dupes: { key: string; examples: MessageDbo[] }[],
) {
  for (const { examples } of dupes) {
    // Pick the message with the highest priority
    const keep = examples.reduce((best, curr) => {
      return messagePriority[curr.messageType] >
        messagePriority[best.messageType]
        ? curr
        : best;
    });

    const toDelete = examples.filter((m) => m.pk1 !== keep.pk1); // pk1 includes the message type

    for (const msg of toDelete) {
      await dbClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk1: msg.pk1, sk1: msg.sk1 },
        }),
      );
      console.log(`🗑️ Deleted ${msg.id} (${msg.messageType})`);
    }

    console.log(`✅ Kept ${keep.id} (${keep.messageType})`);
  }
}

async function findDuplicates() {
  const duplicates: Record<string, MessageDbo[]> = {};

  const items = await scanAll<MessageDbo>({
    TableName: TABLE_NAME,
    FilterExpression:
      "begins_with(pk1, :guildPrefix) AND begins_with(sk1, :createdPrefix)",
    ExpressionAttributeValues: {
      ":guildPrefix": `guild#${GUILD_ID}#messageType`,
      ":createdPrefix": "createdAt",
    },
  });

  items.forEach((item) => {
    const existing = duplicates[item.id] ?? [];
    duplicates[item.id] = [...existing, item];
  });

  const dupes = Object.entries(duplicates)
    .filter(([, msgs]) => msgs.length > 1)
    .map(([key, msgs]) => ({ key, examples: msgs }));

  if (dupes.length === 0) {
    console.log("✅ No duplicate message rows found");
    return;
  }

  console.log(`⚠️ Found ${dupes.length} duplicate sets:\n`);
  for (const { key, examples } of dupes) {
    console.log(`Message ID: ${key}`);
    console.log(
      examples
        .map(
          (m) =>
            `  ${`type=${m.messageType},`.padEnd(17, " ")} createdAt=${m.createdAt}, pk1=${m.pk1}, sk1=${m.sk1}`,
        )
        .join("\n"),
    );
    console.log("");
  }

  if (await confirm("Proceed with cleanup?")) {
    await cleanupDuplicates(dupes);
  } else {
    console.log("Cleanup aborted.");
  }
}

findDuplicates().catch((err) => {
  console.error("Error scanning table:", err);
  process.exit(1);
});
