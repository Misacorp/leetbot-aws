import type { UserMessageCount } from "src/discord/utils/messageCounts";

/**
 * Returns all user ids tied for the highest message count.
 */
export const resolveSeasonWinnerUserIds = (
  messageCounts: UserMessageCount[],
): string[] => {
  const topMessageCount = messageCounts[0]?.messageCount;

  if (!topMessageCount) {
    return [];
  }

  return messageCounts
    .filter((messageCount) => messageCount.messageCount === topMessageCount)
    .map((messageCount) => messageCount.userId);
};
