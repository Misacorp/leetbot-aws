import { getDatePrefix, isLeet } from "@/src/util/dateTime";
import type { LeetDayParticipant, LeetDays } from "./types";

export interface LeetMessageLike {
  userId: string;
  // ISO-8601 timestamp (UTC)
  createdAt: string;
}

export interface CollectLeetDaysInput {
  // Messages in ascending createdAt order, as the database returns them
  messages: AsyncIterable<LeetMessageLike> | Iterable<LeetMessageLike>;
  guildId: string;
  // First guild-local date to include (YYYY-MM-DD). Default: no lower bound
  fromDate?: string;
  // Last guild-local date to include (YYYY-MM-DD). Default: no upper bound
  toDate?: string;
  // Maximum number of days to collect. Default: no limit
  limit?: number;
  // IANA timezone that decides the 13:37 window and the guild-local dates
  timezone: string;
}

/**
 * Groups leet messages into days.
 *
 * - Keeps only real leets (13:37 in the timezone). Test flags can write others.
 * - Groups by guild-local date and keeps each player's earliest leet per day.
 * - Collects at most `limit` days. Reading stops as soon as a further day is
 *   seen, so a day is never split across pages and `hasMore` is exact.
 */
export const collectLeetDays = async ({
  messages,
  guildId,
  fromDate,
  toDate,
  limit = Number.POSITIVE_INFINITY,
  timezone,
}: CollectLeetDaysInput): Promise<LeetDays> => {
  const participantsByDate = new Map<string, Map<string, LeetDayParticipant>>();
  let hasMore = false;

  for await (const message of messages) {
    const epoch = Date.parse(message.createdAt);
    if (Number.isNaN(epoch) || !isLeet(epoch, timezone)) {
      continue;
    }

    const date = getDatePrefix(epoch, timezone);
    if (
      (fromDate !== undefined && date < fromDate) ||
      (toDate !== undefined && date > toDate)
    ) {
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
