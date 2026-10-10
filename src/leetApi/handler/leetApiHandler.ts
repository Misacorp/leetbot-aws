import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";
import logger from "@logger";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { getFinalisedLeetDays } from "../service/getFinalisedLeetDays";
import {
  isValidGuildId,
  validateDaysQuery,
} from "../service/validateDaysQuery";
import { authenticateRequest } from "./authenticateRequest";
import { jsonResponse } from "./jsonResponse";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
      API_KEY_HASHES_PARAM_NAME: string;
    }
  }
}

/**
 * Entrypoint of the read-only Leet API (API Gateway HTTP API, payload v2).
 * Never log the event: it carries the Authorization header.
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    switch (event.routeKey) {
      case "GET /v1/health":
        return jsonResponse(200, { ok: true });
      case "GET /v1/guilds/{guildId}/days":
        return await handleGetDays(event);
      default:
        return jsonResponse(404, { error: "not_found" });
    }
  } catch (error) {
    logger.error(
      {
        routeKey: event.routeKey,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : undefined,
      },
      "Leet API request failed",
    );

    return jsonResponse(500, { error: "internal" });
  }
};

const handleGetDays = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const verdict = await authenticateRequest(
    event,
    process.env.API_KEY_HASHES_PARAM_NAME,
  );
  if (verdict === "not_configured") {
    logger.error("Leet API consumer keys are not configured");
    return jsonResponse(503, { error: "not_configured" });
  }
  if (verdict === "unauthorized") {
    return jsonResponse(401, { error: "unauthorized" });
  }

  const guildId = event.pathParameters?.guildId;
  if (!isValidGuildId(guildId)) {
    return jsonResponse(400, {
      error: "invalid_request",
      message: "guildId must be a Discord id",
    });
  }

  const query = validateDaysQuery(event.queryStringParameters);
  if (!query.ok) {
    return jsonResponse(400, {
      error: "invalid_request",
      message: query.message,
    });
  }

  const guild = await getGuildById({
    tableName: process.env.TABLE_NAME,
    id: guildId,
  });
  if (!guild) {
    return jsonResponse(404, { error: "guild_not_found" });
  }

  const response = await getFinalisedLeetDays({
    tableName: process.env.TABLE_NAME,
    guildId,
    query: query.value,
  });

  return jsonResponse(200, response);
};
