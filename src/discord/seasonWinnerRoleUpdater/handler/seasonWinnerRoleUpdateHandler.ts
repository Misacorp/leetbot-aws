import type { SNSEvent } from "aws-lambda";
import { REST } from "/opt/nodejs/discord";
import { getValidatedParameter } from "src/util/ssm";
import { normalizeRequestPayloads } from "./normalizeRequestPayloads";
import { syncSeasonWinnerRolesForInvocation } from "../sync/syncSeasonWinnerRolesForInvocation";
import type { SeasonWinnerRoleUpdateParams } from "../types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
      TOKEN_PARAMETER_NAME: string;
    }
  }
}

export const handler = async (
  event: SNSEvent | SeasonWinnerRoleUpdateParams,
): Promise<void> => {
  const requests = normalizeRequestPayloads(event);
  const token = await getValidatedParameter(
    process.env.TOKEN_PARAMETER_NAME,
    true,
  );
  const rest = new REST().setToken(token);

  const requestResults = await Promise.allSettled(
    requests.map((request) =>
      syncSeasonWinnerRolesForInvocation({
        request,
        rest,
        tableName: process.env.TABLE_NAME,
      }),
    ),
  );

  const failedRequests = requestResults.filter(
    (result) => result.status === "rejected",
  );

  if (failedRequests.length > 0) {
    const errors = failedRequests.map((result) =>
      result.status === "rejected" ? String(result.reason) : "",
    );
    throw new Error(
      `Season winner role sync failed for ${failedRequests.length} request(s): ${errors.join(" | ")}`,
    );
  }
};
