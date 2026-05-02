import {
  countMessagesByUser,
  type UserMessageCount,
} from "@/src/discord/utils/messageCounts";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { MessageTypes } from "@/src/types";

/**
 * Fetches a guild's leet messages for a date range and returns per-user counts.
 */
export const getGuildLeetMessageCounts = async ({
  tableName,
  guildId,
  startDate,
  endDate,
}: {
  tableName: string;
  guildId: string;
  startDate: Date;
  endDate: Date;
}): Promise<UserMessageCount[]> =>
  countMessagesByUser(
    await getGuildMessages({
      tableName,
      guildId,
      type: MessageTypes.LEET,
      startDate,
      endDate,
    }),
  );
