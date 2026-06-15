import { MessageTypes } from "@/src/types";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";

const MULTI_LEET_EMOJIS: Record<number, string> = {
  2: "👀",
  3: "😮",
  4: "🤯",
  5: "🤩",
  6: "🔥",
  7: "💥",
  8: "⭐",
  9: "🌟",
};

const MULTI_LEET_MAX_EMOJI = "💎";

export const getMultiLeetEmoji = (count: number): string | undefined => {
  if (count < 2) return undefined;
  return MULTI_LEET_EMOJIS[count] ?? MULTI_LEET_MAX_EMOJI;
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
