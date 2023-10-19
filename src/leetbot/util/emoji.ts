import { Guild, type GuildEmoji } from "/opt/nodejs/discord";

export const fallbackEmoji = "❔";

/**
 * Finds an emoji from a guild.
 * The guild can be `null` (supposedly in private messages).
 * @param guild Guild
 * @param name  Emoji name
 */
export const findEmoji = (
  guild: Guild | null,
  name: string,
): GuildEmoji | undefined =>
  guild?.emojis.cache.find((emoji) => emoji.name === name);
