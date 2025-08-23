import type { Guild, Emoji } from "@/src/repository/guild/types";

export const fallbackEmoji = "❔";

/**
 * Finds an emoji from a guild.
 * The guild can be `null` (supposedly in private messages).
 * @param guild Guild
 * @param name  Emoji name
 */
export const findEmoji = (guild: Guild, name: string): Emoji | undefined =>
  guild.emojis.find((emoji) => emoji.name === name);
