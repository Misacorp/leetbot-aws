import type { Message } from "@/src/repository/message/types";

/**
 * Sums the seconds and milliseconds of a timestamp.
 * Example: 3 seconds and 52 milliseconds = 3052 milliseconds.
 * @param isoDate ISO-8601 date string
 */
const getTotalMs = (isoDate: string): number => {
  const date = new Date(isoDate);
  return date.getSeconds() * 1000 + date.getMilliseconds();
};

/**
 * Gets the fastest messages in the given list of messages.
 * Looks at the milliseconds of each message and ignores other properties.
 * The message with the lowest millisecond count is considered the fastest.
 * @param messages Messages to search
 * @returns Array of fastest messages (for same-millisecond accuracy) and the milliseconds.
 */
export const getFastestMessages = (
  messages: Message[],
): { messages: Message[]; ms: number } => {
  let fastestMessages: Message[] = [messages[0]];
  let fastestMessageMs: number = getTotalMs(fastestMessages[0].createdAt);

  // Start from the 2nd message onward (works even if there's just one message)
  messages.slice(1).forEach((message) => {
    const ms = getTotalMs(message.createdAt);
    if (ms < fastestMessageMs) {
      fastestMessages = [message];
      fastestMessageMs = ms;
      return;
    }

    // Handle same-millisecond messages
    if (ms === fastestMessageMs) {
      fastestMessages.push(message);
    }
  });

  return { messages: fastestMessages, ms: fastestMessageMs };
};
