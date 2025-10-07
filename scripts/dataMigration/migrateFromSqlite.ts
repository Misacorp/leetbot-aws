/**
 * This script expects an SQLite file named "leet.db" to be in this directory.
 * It reads messages from that database and shoves them into DynamoDB.
 *
 * RUN THIS FROM THE PROJECT ROOT
 *
 * Usage: ENVIRONMENT=dev aws-vault exec leetbot-dev -- ts-node ./scripts/dataMigration/migrateFromSqlite.ts
 */
import Database from "better-sqlite3";
import { BatchWriteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import readline from "readline";
import { MessageDbo } from "@/src/repository/message/types";
import { getDbClient } from "@/src/repository/util";
import { getTableNameFromCdkOutputs } from "@/scripts/getTableNameFromCdkOutputs";
import { MessageType } from "@/src/types";
import { isGameMessage } from "@/src/discord/messageEvaluator/util";
import { UserDbo } from "@/src/repository/user/types";

interface SqliteMessage {
  id: string; // Cast in the SQL query!
  userId: string; // Cast in the SQL query!
  serverId: string; // Cast in the SQL query!
  type: "LEET" | "LEEB" | "FAILED_LEET";
  createdAt: string; // ISO-8601 UTC
}

interface SqliteUser {
  id: string; // Cast in the SQL query!
  name: string;
}

const env = process.env.ENVIRONMENT;
if (!env) {
  throw new Error(
    "ENVIRONMENT is not defined. Run the command with something like ENVIRONMENT=dev aws-vault exec leetbot-dev -- ts-node scripts/findDuplicateMessages.ts",
  );
}

const SQLITE_FILE_PATH = "./scripts/dataMigration/leet.db"; // Designed to be run from the project root
const SOURCE_MESSAGES_TABLE = "messages";
const SOURCE_USERS_TABLE = "users";
const GUILD_ID = "215386000132669440"; // All messages come from one guild FOR NOW
const TARGET_TABLE_NAME = getTableNameFromCdkOutputs(env);
const dbClient = getDbClient();

/**
 * Read messages from SQLite database
 */
const getMessagesFromSqlite = async function (): Promise<SqliteMessage[]> {
  console.log("Reading messages from SQLite");

  const db = new Database(SQLITE_FILE_PATH, { readonly: true });
  const statement = db.prepare<[], SqliteMessage>(
    `SELECT CAST(id AS TEXT) as id, CAST(userId AS TEXT) as userId, CAST(serverId AS TEXT) as serverId, type, createdAt FROM ${SOURCE_MESSAGES_TABLE}`,
  );
  const rows = statement.all();
  db.close();

  return rows;
};

const getUsersFromSqlite = async function (): Promise<SqliteUser[]> {
  console.log("Reading users from SQLite");

  const db = new Database(SQLITE_FILE_PATH, { readonly: true });
  const statement = db.prepare<[], SqliteUser>(
    `SELECT CAST(id AS TEXT) as id, name FROM ${SOURCE_USERS_TABLE}`,
  );
  const rows = statement.all();
  db.close();

  return rows;
};

/**
 * Transforms a message from the SQLite table to a DynamoDB entry
 */
const transformMessage = (input: SqliteMessage): MessageDbo => {
  const messageId = input.id;
  const userId = input.userId;
  const guildId = input.serverId;
  const messageType = input.type.toLowerCase() as MessageType;
  const createdAt = input.createdAt;

  const baseItem: MessageDbo = {
    pk1: `guild#${guildId}#messageType#${messageType}`,
    sk1: `createdAt#${createdAt}#messageId#${messageId}`,
    pk2: `guild#${guildId}#user#${userId}`,
    sk2: `createdAt#${createdAt}#messageId#${messageId}`,
    id: messageId,
    userId: userId,
    guildId: guildId,
    messageType: messageType.toLowerCase() as MessageType,
    createdAt: createdAt,
  };

  if (isGameMessage(messageType)) {
    const createdAtDate = new Date(createdAt);
    const speed = (
      createdAtDate.getUTCSeconds() * 1000 +
      createdAtDate.getUTCMilliseconds()
    )
      .toString()
      .padStart(5, "0");
    baseItem.pk3 = `guild#${guildId}#messageType#${messageType}`;
    baseItem.sk3 = `speed#${speed}#createdAt#${createdAt}#messageId#${messageId}`;
  }

  return baseItem;
};

/**
 * Transforms a user in the old SQLite database to the new DynamoDB format.
 * Will add a placeholder for the username.
 * This will be replaced the first time the user posts a new game message.
 */
const transformUser = (input: SqliteUser): UserDbo => {
  const id = input.id;
  const username = `${input.name} (legacy)`;

  return {
    pk1: `guild#${GUILD_ID}`,
    sk1: `user#${id}`,
    id,
    username,
    displayName: null,
    avatarUrl: null,
    bannerUrl: null,
  };
};

/**
 * Saves a list of users to DynamoDb
 * @param users
 */
const saveUsersToDynamoDb = async (users: UserDbo[]) => {
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const command = new PutCommand({
      TableName: TARGET_TABLE_NAME,
      Item: user,
      ConditionExpression: "attribute_not_exists(pk1)", // Do not overwrite
    });

    try {
      await dbClient.send(command);
    } catch {
      console.info(
        `  User already exists and will not be updated: ${user.id} (${user.username}).`,
      );
    }

    // Wait a bit
    await new Promise((res) => setTimeout(res, 300));
  }
};

/**
 * Writes messages to DynamoDB
 */
const batchWriteToDynamoDb = async (input: MessageDbo[]): Promise<void> => {
  console.log(`Migrating ${input.length} items`);

  const BATCH_SIZE = 25;

  for (let i = 0; i < input.length; i += BATCH_SIZE) {
    const batch = input.slice(i, i + BATCH_SIZE);
    const putRequests = batch.map((item) => ({
      PutRequest: { Item: item },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [TARGET_TABLE_NAME]: putRequests,
      },
    });

    let response = await dbClient.send(command);

    // Retry unprocessed items
    let unprocessed = response.UnprocessedItems?.[TARGET_TABLE_NAME];
    let retries = 0;

    while (unprocessed && unprocessed.length > 0 && retries < 5) {
      // Wait a bit (exponential backoff)
      await new Promise((res) => setTimeout(res, 300 * Math.pow(2, retries)));

      const retryCommand = new BatchWriteCommand({
        RequestItems: { [TARGET_TABLE_NAME]: unprocessed },
      });
      response = await dbClient.send(retryCommand);

      unprocessed = response.UnprocessedItems?.[TARGET_TABLE_NAME];
      retries++;
    }
  }

  console.log("Done");
};

/**
 * Ask the user to confirm something with an interactive prompt
 * @param message Message to show to the user
 */
const confirm = async (message: string) => {
  // Prompt for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer: string = await new Promise((resolve) =>
    rl.question(message, (ans: string) => {
      rl.close();
      resolve(ans);
    }),
  );

  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
};

/**
 * MAIN SCRIPT
 */
const migrateFromSqlite = async function () {
  // Users
  const users = await getUsersFromSqlite();
  const transformedUsers = users.map(transformUser);

  console.log(
    `Found ${users.length} users to migrate. 5 partial sample users to compare the transformation:`,
  );
  for (let i = 0; i < 5; i += 1) {
    const original = users[i];
    const transformed = transformedUsers[i];
    console.log(
      `id:\n    ${original.id}\n -> ${transformed.id}\nusername:\n    ${original.name}\n -> ${transformed.username}`,
    );
  }

  await confirm(
    `Type 'yes' to migrate ${users.length} messages to DynamoDB table named ${TARGET_TABLE_NAME}: `,
  );
  await saveUsersToDynamoDb(transformedUsers);

  // Messages
  const messages = await getMessagesFromSqlite();
  const transformedMessages = messages.map(transformMessage);

  console.log(
    `Found ${messages.length} messages to migrate. 5 partial sample messages to compare the transformation:`,
  );
  for (let i = 0; i < 5; i += 1) {
    const original = messages[i];
    const transformed = transformedMessages[i];
    console.log(
      `id:\n    ${original.id}\n -> ${transformed.id}\nuserId:\n    ${original.userId}\n -> ${transformed.userId}\nguildId:\n    ${original.serverId}\n -> ${transformed.guildId}`,
    );
  }

  await confirm(
    `Type 'yes' to migrate ${messages.length} messages to DynamoDB table named ${TARGET_TABLE_NAME}: `,
  );
  await batchWriteToDynamoDb(transformedMessages);
};

(async () => {
  await migrateFromSqlite();
})();
