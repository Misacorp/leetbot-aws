import { MessageTypes } from "@/src/types";
import { paginateGuildMessagesInRange } from "@/src/repository/message/paginateGuildMessagesInRange";
import type { LeetDaysQuery, LeetDaysResponse } from "../types";
import { buildDaysResponse } from "./buildDaysResponse";
import { collectLeetDays } from "./collectLeetDays";
import {
  getDayStartInstant,
  getFinalisationInstant,
  getLatestFinalisedDate,
} from "./finalisedDays";
import { planDaysQuery } from "./planDaysQuery";

/**
 * Derives a page of finalised leet days for a guild from its leet messages.
 * Read-only. The caller must have checked that the guild exists.
 */
export const getFinalisedLeetDays = async ({
  tableName,
  guildId,
  query,
  now = new Date(),
}: {
  tableName: string;
  guildId: string;
  query: LeetDaysQuery;
  now?: Date;
}): Promise<LeetDaysResponse> => {
  const plan = planDaysQuery(query, getLatestFinalisedDate(now));

  if (!plan) {
    return buildDaysResponse({
      guildId,
      days: [],
      hasMore: false,
      after: query.after,
    });
  }

  const { days, hasMore } = await collectLeetDays({
    messages: paginateGuildMessagesInRange({
      tableName,
      guildId,
      type: MessageTypes.LEET,
      from: getDayStartInstant(plan.startDate).toISOString(),
      to: getFinalisationInstant(plan.lastDate).toISOString(),
    }),
    guildId,
    startDate: plan.startDate,
    lastDate: plan.lastDate,
    limit: query.limit,
  });

  return buildDaysResponse({ guildId, days, hasMore, after: query.after });
};
