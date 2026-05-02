import type { SNSEvent } from "aws-lambda";
import { getLastCompletedSeasonKey, isValidSeasonKey } from "@/src/util/season";
import type { SeasonWinnerRoleUpdateRequest } from "../types";

export const SYNC_SEASON_WINNER_ROLE_ACTION = "sync-season-winner-role";

/**
 * Parses and validates incoming events to the handler.
 */
export const parseAndValidateRequestPayloads = (
  event: SNSEvent | SeasonWinnerRoleUpdateRequest,
): SeasonWinnerRoleUpdateRequest[] => {
  const payloads = parseRequestPayloads(event);

  payloads.forEach((payload) => {
    if (payload.action && payload.action !== SYNC_SEASON_WINNER_ROLE_ACTION) {
      throw new Error(`Unsupported action: ${payload.action}`);
    }

    const seasonKey = payload.seasonKey ?? getLastCompletedSeasonKey();
    if (!isValidSeasonKey(seasonKey)) {
      throw new Error(`Invalid season key: ${seasonKey}`);
    }
  });

  return payloads;
};

/**
 *
 * The event can be from SNS (and therefore contain multiple requests),
 * or from a direct Lambda invocation. This function conforms them into
 * a uniform shape.
 */
const parseRequestPayloads = (
  event: SNSEvent | SeasonWinnerRoleUpdateRequest,
): SeasonWinnerRoleUpdateRequest[] => {
  if (isSnsEvent(event)) {
    return event.Records.map((record) =>
      JSON.parse(record.Sns.Message),
    ) as SeasonWinnerRoleUpdateRequest[];
  }

  if (event && typeof event === "object") {
    return [event];
  }

  return [{}];
};

const isSnsEvent = (
  event: SNSEvent | SeasonWinnerRoleUpdateRequest,
): event is SNSEvent => Array.isArray((event as SNSEvent).Records);
