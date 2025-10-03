import type { Message } from "@/src/repository/message/types";

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
  let fastestMessageMs: number = new Date(
    messages[0].createdAt,
  ).getMilliseconds();

  // Start from the 2nd message onward (works even if there's just one message)
  messages.slice(1).forEach((message) => {
    const ms = new Date(message.createdAt).getMilliseconds();
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
