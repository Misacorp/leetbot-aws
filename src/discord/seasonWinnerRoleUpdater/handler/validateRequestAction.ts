import type { SeasonWinnerRoleUpdateParams } from "../types";

export const SYNC_SEASON_WINNER_ROLE_ACTION = "sync-season-winner-role";

/**
 * Ensures the handler action is one this Lambda understands.
 */
export const validateRequestAction = (
  request: SeasonWinnerRoleUpdateParams,
): void => {
  if (request.action && request.action !== SYNC_SEASON_WINNER_ROLE_ACTION) {
    throw new Error(`Unsupported action: ${request.action}`);
  }
};
