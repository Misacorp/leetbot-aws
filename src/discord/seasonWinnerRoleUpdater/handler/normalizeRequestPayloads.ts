import type { SNSEvent } from "aws-lambda";
import type { SeasonWinnerRoleUpdateParams } from "../types";

/**
 * Normalizes either an SNS event or a direct Lambda invocation payload into
 * a uniform params object.
 */
export const normalizeRequestPayloads = (
  event: SNSEvent | SeasonWinnerRoleUpdateParams,
): SeasonWinnerRoleUpdateParams[] => {
  if (isSnsEvent(event)) {
    return event.Records.map((record) =>
      JSON.parse(record.Sns.Message),
    ) as SeasonWinnerRoleUpdateParams[];
  }

  if (event && typeof event === "object") {
    return [event];
  }

  return [{}];
};

const isSnsEvent = (
  event: SNSEvent | SeasonWinnerRoleUpdateParams,
): event is SNSEvent => Array.isArray((event as SNSEvent).Records);
