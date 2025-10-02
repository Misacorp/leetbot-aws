/**
 * Helpers for general Discord-related operations that can be used by
 * slash command handlers, the Discord bot, message evaluators, etc.
 */
import { Emoji, Guild } from "@/src/repository/guild/types";
import { findEmoji } from "@/src/util/emoji";

/**
 * Creates a string that renders as a custom emoji on a Discord server
 * @param emoji Emoji object - can be undefined
 * @param fallback Fallback string when the emoji is undefined.
 *                 Can also be null to pass through and allow the caller to handle default assignments.
 */
export const createEmojiString = (
  emoji: Emoji | undefined,
  fallback?: string | null | undefined,
) => {
  return emoji ? `<:${emoji.identifier}>` : (fallback ?? undefined);
};

/**
 * Gets all the leet-game-related emojis.
 * Built to handle an undefined guild (returns undefined for each emoji)
 */
export const getGameEmojis = (guild: Guild | null) => {
  const leetEmoji = guild ? findEmoji(guild, "leet") : undefined;
  const leebEmoji = guild ? findEmoji(guild, "leeb") : undefined;
  const failedLeetEmoji = guild ? findEmoji(guild, "failed_leet") : undefined;

  return { leetEmoji, leebEmoji, failedLeetEmoji };
};

/**
 * Gets emoji strings for a list of emojis.
 */
export const getEmojiStrings = (emojis: (Emoji | undefined)[]) =>
  emojis.map((emoji) => createEmojiString(emoji));
