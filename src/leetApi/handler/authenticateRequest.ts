import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { getParameter } from "@/src/util/ssm";
import {
  type ApiKeyVerdict,
  extractBearerToken,
  verifyApiKey,
} from "../service/verifyApiKey";

/**
 * Checks the bearer key of a request against the hashes in Parameter Store.
 * Never logs the key, the hashes or the Authorization header.
 */
export const authenticateRequest = async (
  event: APIGatewayProxyEventV2,
  hashesParameterName: string,
): Promise<ApiKeyVerdict> => {
  const presentedKey = extractBearerToken(event.headers?.authorization);
  if (!presentedKey) {
    return "unauthorized";
  }

  const configuredValue = await getParameter(hashesParameterName, true);

  return verifyApiKey({ presentedKey, configuredValue });
};
