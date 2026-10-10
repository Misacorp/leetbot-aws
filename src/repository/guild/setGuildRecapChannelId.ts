import { patchGuild } from "./patchGuild";
import { ALL_GUILDS_PK, createGuildKey } from "./keys";

/**
 * Sets (or clears) the recap channel ID for a guild.
 */
export const setGuildRecapChannelId = ({
  tableName,
  guildId,
  recapChannelId,
}: {
  tableName: string;
  guildId: string;
  recapChannelId?: string;
}) =>
  patchGuild({
    tableName,
    guildId,
    patch: {
      pk2: ALL_GUILDS_PK,
      sk2: createGuildKey(guildId),
      recapChannelId: recapChannelId ?? null,
    },
  });
