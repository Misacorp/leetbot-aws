import type { SNSEvent } from "aws-lambda";
import logger from "@logger";
import { getLastCompletedSeasonKey, toSeasonDateRange } from "@/src/util/season";
import { getValidatedParameter } from "@/src/util/ssm";
import { getGuildsWithRecapChannel } from "@/src/repository/guild/getGuildsWithRecapChannel";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { MessageTypes } from "@/src/types";
import { getMultiLeetName, getMultiLeetFallback } from "@/src/discord/messageEvaluator/multiLeet";
import { postMessage } from "@/src/discord/rest/webhooks/postMessage";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
      TOKEN_PARAMETER_NAME: string;
      DRY_RUN: string;
    }
  }
}

interface SeasonRecapRequest {
  seasonKey?: string;
  source?: string;
}

const isDryRun = process.env.DRY_RUN !== "false";

interface MultiLeetTierCount {
  count: number;
  occurrences: number;
}

/**
 * Groups leet messages by calendar day and returns multi-leet days (2+ leets).
 * Returns one entry per day, sorted by day descending.
 */
function getMultiLeetDays(
  messages: { createdAt: string }[],
): { date: string; count: number }[] {
  const byDay = new Map<string, number>();

  for (const msg of messages) {
    const day = msg.createdAt.slice(0, 10); // YYYY-MM-DD
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  return [...byDay.entries()]
    .filter(([, count]) => count >= 2)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function buildRecapMessage(seasonKey: string, totalLeets: number, multiLeetDays: { date: string; count: number }[]): string {
  const lines: string[] = [`📊 **Season ${seasonKey} leet recap**`, `**${totalLeets}** leet${totalLeets === 1 ? "" : "s"} posted this season!`];

  if (multiLeetDays.length === 0) {
    lines.push("", "No multi-leet days this season.");
    return lines.join("\n");
  }

  // Tally occurrences per tier
  const tierOccurrences = new Map<number, MultiLeetTierCount>();
  let peakDay = multiLeetDays[0];

  for (const day of multiLeetDays) {
    const existing = tierOccurrences.get(day.count);
    tierOccurrences.set(day.count, {
      count: day.count,
      occurrences: (existing?.occurrences ?? 0) + 1,
    });
    if (day.count > peakDay.count) {
      peakDay = day;
    }
  }

  lines.push("", "Multi-leet days:");

  // Sort tiers ascending so they read naturally (double → triple → ...)
  const sortedTiers = [...tierOccurrences.values()].sort(
    (a, b) => a.count - b.count,
  );

  for (const tier of sortedTiers) {
    const emoji = getMultiLeetFallback(tier.count) ?? "⭐";
    const name = getMultiLeetName(tier.count) ?? "multi-leet";
    const displayName = name.replace(/_/g, " ");
    lines.push(`${emoji} **${displayName}**: ${tier.occurrences}×`);
  }

  const peakEmoji = getMultiLeetFallback(peakDay.count) ?? "⭐";
  const peakName = (getMultiLeetName(peakDay.count) ?? "multi-leet").replace(/_/g, " ");
  lines.push("", `Peak day: ${peakEmoji} **${peakName}** on ${peakDay.date} (${peakDay.count} leets)`);

  return lines.join("\n");
}

export const handler = async (event: SNSEvent | SeasonRecapRequest): Promise<void> => {
  const botToken = await getValidatedParameter(process.env.TOKEN_PARAMETER_NAME, true);

  const payload: SeasonRecapRequest =
    "Records" in event
      ? JSON.parse(event.Records[0].Sns.Message)
      : event;

  const seasonKey = payload.seasonKey ?? getLastCompletedSeasonKey();
  const { startDate, endDate } = toSeasonDateRange(seasonKey);

  const guilds = await getGuildsWithRecapChannel({
    tableName: process.env.TABLE_NAME,
  });

  logger.info(
    { seasonKey, guilds: guilds.length },
    "Starting season recap",
  );

  const results = await Promise.allSettled(
    guilds.map(async (guild) => {
      const messages = await getGuildMessages({
        tableName: process.env.TABLE_NAME,
        guildId: guild.id,
        type: MessageTypes.LEET,
        startDate,
        endDate,
      });

      const multiLeetDays = getMultiLeetDays(messages);
      const content = buildRecapMessage(seasonKey, messages.length, multiLeetDays);

      logger.info(
        { guildId: guild.id, totalLeets: messages.length, multiLeetDays: multiLeetDays.length },
        "Posting season recap",
      );

      if (isDryRun) {
        logger.info({ content }, "Dry run — skipping Discord post");
        return;
      }

      await postMessage({
        botToken,
        channelId: guild.recapChannelId,
        payload: { content },
      });
    }),
  );

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) {
    const errors = failures.map((r) =>
      r.status === "rejected" ? String(r.reason) : "",
    );
    throw new Error(
      `Season recap failed for ${failures.length} guild(s): ${errors.join(" | ")}`,
    );
  }
};
