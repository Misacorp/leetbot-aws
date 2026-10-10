import { getDatePrefix, isLeet } from "@/src/util/dateTime";
import type { LeetDay, LeetDayParticipant } from "../types";

export interface LeetMessageLike {
  userId: string;
  // ISO-8601 timestamp (UTC)
  createdAt: string;
}

export interface CollectLeetDaysInput {
  // Messages in ascending createdAt order, as the database returns them
  messages: AsyncIterable<LeetMessageLike> | Iterable<LeetMessageLike>;
  guildId: string;
  // First Helsinki date to include
  startDate: string;
  // Last Helsinki date to include (the latest finalised date)
  lastDate: string;
  limit: number;
}

/**
 * Groups leet messages into days.
 *
 * - Keeps only real leets (13:37 Helsinki). Test flags can write others.
 * - Groups by Helsinki date and keeps each player's earliest leet per day.
 * - Collects at most `limit` days. Reading stops as soon as a further day is
 *   seen, so a day is never split across pages and `hasMore` is exact.
 */
export const collectLeetDays = async ({
  messages,
  guildId,
  startDate,
  lastDate,
  limit,
}: CollectLeetDaysInput): Promise<{ days: LeetDay[]; hasMore: boolean }> => {
  const participantsByDate = new Map<string, Map<string, LeetDayParticipant>>();
  let hasMore = false;

  for await (const message of messages) {
    const epoch = Date.parse(message.createdAt);
    if (Number.isNaN(epoch) || !isLeet(epoch)) {
      continue;
    }

    const date = getDatePrefix(epoch);
    if (date < startDate || date > lastDate) {
      continue;
    }

    let participants = participantsByDate.get(date);
    if (!participants) {
      if (participantsByDate.size >= limit) {
        hasMore = true;
        break;
      }
      participants = new Map();
      participantsByDate.set(date, participants);
    }

    const existing = participants.get(message.userId);
    if (!existing || message.createdAt < existing.leetAt) {
      participants.set(message.userId, {
        userId: message.userId,
        leetAt: message.createdAt,
      });
    }
  }

  const days = [...participantsByDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, participants]) => ({
      id: `${guildId}:${date}`,
      date,
      participants: [...participants.values()].sort(
        (a, b) =>
          (a.leetAt < b.leetAt ? -1 : a.leetAt > b.leetAt ? 1 : 0) ||
          (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
      ),
    }));

  return { days, hasMore };
};
