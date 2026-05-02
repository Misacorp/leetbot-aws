import type { SNSEvent } from "aws-lambda";
import { REST } from "/opt/nodejs/discord";
import { getLastCompletedSeasonKey } from "@/src/util/season";
import { getValidatedParameter } from "src/util/ssm";
import { parseAndValidateRequestPayloads } from "./validateRequest";
import { updateSeasonWinnerRoles } from "../service/updateSeasonWinnerRoles";
import type { SeasonWinnerRoleUpdateRequest } from "../types";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
      TOKEN_PARAMETER_NAME: string;
    }
  }
}

/**
 * Handler for assigning roles to players who won the given "leet season".
 */
export const handler = async (
  event: SNSEvent | SeasonWinnerRoleUpdateRequest,
): Promise<void> => {
  const payloads = parseAndValidateRequestPayloads(event);
  const token = await getValidatedParameter(
    process.env.TOKEN_PARAMETER_NAME,
    true,
  );
  const rest = new REST().setToken(token);

  const results = await Promise.allSettled(
    payloads.map((payload) =>
      updateSeasonWinnerRoles({
        seasonKey: payload.seasonKey ?? getLastCompletedSeasonKey(),
        rest,
        tableName: process.env.TABLE_NAME,
      }),
    ),
  );

  const failedRequests = results.filter(
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
