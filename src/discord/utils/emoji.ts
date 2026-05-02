/**
 * Helpers for Discord emoji operations shared across bot flows.
 */
import { Emoji, Guild } from "@/src/repository/guild/types";
import { findEmoji } from "@/src/util/emoji";

/**
 * Detects if a given input matches the string representation of a custom Discord emoji.
 */
export const isCustomDiscordEmoji = (
  input: string,
  emojiIdToMatch: string,
): boolean => input === `<:${emojiIdToMatch}>`;

/**
 * Creates a string that renders as a custom emoji on a Discord server.
 */
export const createEmojiString = (
  emoji: Emoji | undefined,
  fallback?: string | null | undefined,
) => {
  return emoji ? `<:${emoji.identifier}>` : (fallback ?? undefined);
};

/**
 * Gets all the leet-game-related emojis.
 */
export const getGameEmojis = (guild: Guild | null) => {
  const leet = guild ? findEmoji(guild, "leet") : undefined;
  const leeb = guild ? findEmoji(guild, "leeb") : undefined;
  const failed_leet = guild ? findEmoji(guild, "failed_leet") : undefined;

  return { leet, leeb, failed_leet };
};

/**
 * Gets emoji strings for a list of emojis.
 */
export const getEmojiStrings = (emojis: (Emoji | undefined)[]) =>
  emojis.map((emoji) => createEmojiString(emoji));
