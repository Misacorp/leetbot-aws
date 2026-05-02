import type { Message } from "@/src/repository/message/types";

export interface UserMessageCount {
  userId: string;
  messageCount: number;
}

/**
 * Groups messages by user id and returns counts in descending order.
 */
export const countMessagesByUser = (
  messages: Message[],
): UserMessageCount[] => {
  const messageCountsByUser = messages.reduce((counts, message) => {
    counts.set(message.userId, (counts.get(message.userId) ?? 0) + 1);
    return counts;
  }, new Map<Message["userId"], number>());

  return [...messageCountsByUser.entries()]
    .map(([userId, messageCount]) => ({
      userId,
      messageCount,
    }))
    .sort(
      (a, b) =>
        b.messageCount - a.messageCount || a.userId.localeCompare(b.userId),
    );
};
