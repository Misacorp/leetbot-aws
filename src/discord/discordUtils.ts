/**
 * Helpers for general Discord-related operations that can be used by
 * slash command handlers, the Discord bot, message evaluators, etc.
 */
export {
  createEmojiString,
  getEmojiStrings,
  getGameEmojis,
  isCustomDiscordEmoji,
} from "@/src/discord/utils/emoji";

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
