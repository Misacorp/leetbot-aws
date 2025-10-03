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
  const leet = guild ? findEmoji(guild, "leet") : undefined;
  const leeb = guild ? findEmoji(guild, "leeb") : undefined;
  const failed_leet = guild ? findEmoji(guild, "failed_leet") : undefined;

  return { leet, leeb, failed_leet }; // Using snake_case for failed_leet to match the Discord subcommand naming
};

/**
 * Gets emoji strings for a list of emojis.
 */
export const getEmojiStrings = (emojis: (Emoji | undefined)[]) =>
  emojis.map((emoji) => createEmojiString(emoji));

/**
 * Timestamp display modes
 * @see https://sesh.fyi/timestamp/
 */
type DateRepresentationMode = "F" | "f" | "D" | "d" | "T" | "t" | "R";

/**
 * Creates a Discord timestamp expression
 * @param date Date
 * @param mode Date representation mode
 */
export const createDateString = (
  date: Date,
  mode: DateRepresentationMode = "D",
) => `<t:${Math.floor(date.getTime() / 1000)}:${mode}>`;
