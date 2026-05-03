export const ALL_GUILDS_PK = "guild";

/**
 * Transforms a guild ID into a database key
 */
export const createGuildKey = (guildId: string) => `guild#${guildId}` as const;
