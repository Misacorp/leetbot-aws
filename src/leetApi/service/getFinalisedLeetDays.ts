import { MessageTypes } from "@/src/types";
import { paginateGuildMessages } from "@/src/repository/message/getGuildMessages";
import {
  getDayStartInstant,
  getFinalisationInstant,
  getLatestFinalisedDate,
} from "@/src/util/finalisedDays";
import type { LeetDay } from "../types";
import { collectLeetDays } from "./collectLeetDays";
import { planDaysQuery } from "./planDaysQuery";

/**
 * Derives a page of finalised leet days for a guild from its leet messages.
 * Read-only. The caller must have checked that the guild exists.
 *
 * `startDate` is the first guild-local date to include (YYYY-MM-DD). Without
 * it, reading starts at the beginning. Days are a guild-local calendar in
 * `timezone` (an IANA name) and are finalised at 13:40 in that timezone.
 */
export const getFinalisedLeetDays = async ({
  tableName,
  guildId,
  startDate,
  limit,
  timezone,
  now,
}: {
  tableName: string;
  guildId: string;
  startDate?: string;
  limit: number;
  timezone: string;
  now: Date;
}): Promise<{ days: LeetDay[]; hasMore: boolean }> => {
  const plan = planDaysQuery(startDate, getLatestFinalisedDate(now, timezone));

  if (!plan) {
    return { days: [], hasMore: false };
  }

  return collectLeetDays({
    messages: paginateGuildMessages({
      tableName,
      guildId,
      type: MessageTypes.LEET,
      from: getDayStartInstant(plan.startDate, timezone).toISOString(),
      to: getFinalisationInstant(plan.lastDate, timezone).toISOString(),
    }),
    guildId,
    startDate: plan.startDate,
    lastDate: plan.lastDate,
    limit,
    timezone,
  });
};
