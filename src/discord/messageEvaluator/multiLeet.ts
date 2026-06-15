import { MessageTypes } from "@/src/types";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";

const MULTI_LEET_NAMES: Record<number, string> = {
  2: "double_leet",
  3: "triple_leet",
  4: "overleet",
  5: "leettacular",
  6: "leetrocity",
  7: "leetamanjaro",
  8: "leetastrophe",
  9: "leetpocalypse",
};

const MULTI_LEET_MAX_NAME = "leetionaire";

/**
 * Returns the application emoji name for the given leet count.
 * Returns undefined for counts below 2 (no multi-leet).
 */
export const getMultiLeetName = (count: number): string | undefined => {
  if (count < 2) return undefined;
  return MULTI_LEET_NAMES[count] ?? MULTI_LEET_MAX_NAME;
};

const MULTI_LEET_FALLBACKS: Record<number, string> = {
  2: "👀",
  3: "😮",
  4: "🤯",
  5: "🤩",
  6: "🔥",
  7: "💥",
  8: "⭐",
  9: "🌟",
};

const MULTI_LEET_MAX_FALLBACK = "💎";

/**
 * Returns a Unicode emoji fallback for the given leet count.
 */
export const getMultiLeetFallback = (count: number): string | undefined => {
  if (count < 2) return undefined;
  return MULTI_LEET_FALLBACKS[count] ?? MULTI_LEET_MAX_FALLBACK;
};

/**
 * Gets the LEET count for the given timestamp's day
 */
export const getTodayLeetCount = async ({
  guildId,
  tableName,
  timestamp,
}: {
  guildId: string;
  tableName: string;
  timestamp: number;
}): Promise<number> => {
  const date = new Date(timestamp);
  const messages = await getGuildMessages({
    tableName,
    guildId,
    type: MessageTypes.LEET,
    startDate: date,
    // ⚠️ Note: susceptible to race conditions since this will be transformed to end-of-day
    endDate: date,
  });

  return messages.length;
};
