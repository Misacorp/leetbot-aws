import logger from "@logger";
import {
  toSeasonDateRange,
  isValidSeasonKey,
  getLastCompletedSeasonKey,
} from "@/src/util/season";
import { getGuildsWithSeasonWinnerRole } from "@/src/repository/guild/getGuildsWithSeasonWinnerRole";
import { validateRequestAction } from "../handler/validateRequestAction";
import { syncGuildSeasonWinnerRole } from "./syncGuildSeasonWinnerRole";
import type {
  SeasonWinnerRoleSyncContext,
  SeasonWinnerRoleUpdateParams,
} from "../types";

/**
 * Handles one normalized season-winner sync handler.
 */
export const syncSeasonWinnerRolesForInvocation = async ({
  request,
  rest,
  tableName,
}: SeasonWinnerRoleSyncContext & {
  request: SeasonWinnerRoleUpdateParams;
}): Promise<void> => {
  validateRequestAction(request);

  const seasonKey = request.seasonKey ?? getLastCompletedSeasonKey();
  if (!isValidSeasonKey(seasonKey)) {
    throw new Error(`Invalid season key: ${seasonKey}`);
  }

  const { startDate, endDate } = toSeasonDateRange(seasonKey);
  const configuredGuilds = await getGuildsWithSeasonWinnerRole({
    tableName,
  });

  logger.info(
    {
      source: request.source ?? "manual",
      seasonKey,
      configuredGuilds: configuredGuilds.length,
    },
    "Starting season winner role sync",
  );

  const guildResults = await Promise.allSettled(
    configuredGuilds.map((guild) =>
      syncGuildSeasonWinnerRole({
        rest,
        tableName,
        guildId: guild.id,
        seasonWinnerRoleId: guild.seasonWinnerRoleId,
        startDate,
        endDate,
        seasonKey,
      }),
    ),
  );

  const failedGuilds = guildResults.filter(
    (result) => result.status === "rejected",
  );

  if (failedGuilds.length > 0) {
    const errors = failedGuilds.map((result) =>
      result.status === "rejected" ? String(result.reason) : "",
    );
    throw new Error(
      `Season winner role sync failed for ${failedGuilds.length} guild(s): ${errors.join(" | ")}`,
    );
  }
};
