import { patchGuild } from "./patchGuild";
import { ALL_GUILDS_PK, createGuildKey } from "./keys";

/**
 * Sets the 'season winner role ID' for a given guild.
 */
export const setGuildSeasonWinnerRoleId = ({
  tableName,
  guildId,
  seasonWinnerRoleId,
}: {
  tableName: string;
  guildId: string;
  seasonWinnerRoleId?: string;
}) =>
  patchGuild({
    tableName,
    guildId,
    patch: {
      pk2: ALL_GUILDS_PK,
      sk2: createGuildKey(guildId),
      seasonWinnerRoleId: seasonWinnerRoleId ?? null,
    },
  });
