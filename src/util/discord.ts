/**
 * Helpers for general Discord-related operations that can be used by
 * slash command handlers, the Discord bot, message evaluators, etc.
 */
import { Emoji } from "@/src/repository/guild/types";

/**
 * Creates a string that renders as a custom emoji on a Discord server
 * @param emoji Emoji object - can be undefined
 * @param fallback Fallback string when the emoji is undefined
 */
export const createEmojiString = (
  emoji: Emoji | undefined,
  fallback: string,
) => {
  return emoji ? `<:${emoji.identifier}>` : fallback;
};
