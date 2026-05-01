import { UpdateCommand, type UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { createGuildKey } from "./keys";
import { type GuildDbo } from "./types";

const dbClient = getDbClient();

type PatchableGuildField =
  | "id"
  | "name"
  | "iconUrl"
  | "emojis"
  | "seasonWinnerRoleId"
  | "pk2"
  | "sk2";

type GuildPatchValue = GuildDbo[PatchableGuildField] | null;

export type GuildPatch = Partial<Record<PatchableGuildField, GuildPatchValue>>;

// Expression attribute map to account for reserved DynamoDB names
const ATTRIBUTE_NAME_BY_FIELD: Partial<Record<PatchableGuildField, string>> = {
  name: "#name",
};

/**
 * Applies a partial update to a guild row by ID
 * Undefined fields are ignored and null fields are removed.
 */
export const patchGuild = ({
  tableName,
  guildId,
  patch,
}: {
  tableName: string;
  guildId: string;
  patch: GuildPatch;
}): Promise<UpdateCommandOutput> => {
  const patchEntries = Object.entries(patch).filter(
    ([, value]) => value !== undefined,
    // Casting because Object.entries widens the type to 'string'
  ) as [PatchableGuildField, GuildPatchValue][];

  if (patchEntries.length === 0) {
    throw new Error("patchGuild requires at least one defined field");
  }

  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};
  const setExpressions: string[] = [];
  const removeExpressions: string[] = [];

  patchEntries.forEach(([field, value]) => {
    const attributeName = ATTRIBUTE_NAME_BY_FIELD[field] ?? field;

    // Fields with reserved names
    const isReservedName = Boolean(ATTRIBUTE_NAME_BY_FIELD[field]);
    if (isReservedName) {
      expressionAttributeNames[attributeName] = field;
    }

    // Fields to remove
    if (value === null) {
      removeExpressions.push(attributeName);
      return;
    }

    // Value expression mapping
    const valueKey = `:${field}`;
    setExpressions.push(`${attributeName} = ${valueKey}`);
    expressionAttributeValues[valueKey] = value;
  });

  // Build the update expression
  const updateExpressionParts = [];
  if (setExpressions.length > 0) {
    updateExpressionParts.push(`SET ${setExpressions.join(", ")}`);
  }
  if (removeExpressions.length > 0) {
    updateExpressionParts.push(`REMOVE ${removeExpressions.join(", ")}`);
  }
  const updateExpression = updateExpressionParts.join(" ");

  const command = new UpdateCommand({
    TableName: tableName,
    Key: {
      pk1: createGuildKey(guildId),
      sk1: "metadata",
    },
    ConditionExpression: "attribute_exists(pk1) AND attribute_exists(sk1)",
    UpdateExpression: updateExpression,
    ExpressionAttributeNames:
      Object.keys(expressionAttributeNames).length > 0
        ? expressionAttributeNames
        : undefined,
    ExpressionAttributeValues:
      Object.keys(expressionAttributeValues).length > 0
        ? expressionAttributeValues
        : undefined,
  });

  return dbClient.send(command);
};
