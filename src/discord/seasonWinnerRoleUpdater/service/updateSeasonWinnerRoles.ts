import logger from "@logger";
import { getGuildsWithSeasonWinnerRole } from "@/src/repository/guild/getGuildsWithSeasonWinnerRole";
import { toSeasonDateRange } from "@/src/util/season";
import { updateSeasonWinnerRolesInGuild } from "./updateSeasonWinnerRolesInGuild";
import type { REST } from "@/src/layers/discord/nodejs/discord";

/**
 * Updates season winner roles in all guilds.
 * New winners get the role and the undeserving lose the role.
 */
export const updateSeasonWinnerRoles = async ({
  rest,
  tableName,
  seasonKey,
}: {
  rest: REST;
  tableName: string;
  seasonKey: string;
}): Promise<void> => {
  const { startDate, endDate } = toSeasonDateRange(seasonKey);
  const configuredGuilds = await getGuildsWithSeasonWinnerRole({
    tableName,
  });

  logger.debug(
    {
      seasonKey,
      configuredGuilds: configuredGuilds.length,
    },
    "Starting season winner role sync",
  );

  const guildResults = await Promise.allSettled(
    configuredGuilds.map((guild) =>
      updateSeasonWinnerRolesInGuild({
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

  console.info(
    `Season winner roles were successfully updated for ${guildResults.length} guild(s).`,
  );
};
