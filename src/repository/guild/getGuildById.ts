import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDbClient } from "@/src/repository/util";
import { Guild } from "./types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
    }
  }
}

const dbClient = getDbClient();

export const getGuildById = async (id: string): Promise<Guild | null> => {
  const command = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk1: `guild#${id}`,
      sk1: "metadata",
    },
    ProjectionExpression: "id, #name, iconUrl, emojis",
    ExpressionAttributeNames: {
      "#name": "name",
    },
  });

  const response = await dbClient.send(command);

  return response.Item as Guild | null;
};
