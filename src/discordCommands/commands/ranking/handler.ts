import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { type RankingCommandData } from "./schema";
import { updateOriginalResponse } from "../../discordWebhook";
import { getDateRange, getWindowDisplayText } from "../../utils/dateUtils";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import type { User } from "@/src/repository/user/types";
import logger from "@logger";

export async function handleRankingCommand(
  interaction: APIChatInputApplicationCommandInteraction,
  data: RankingCommandData, // This is now auto-generated from schema!
): Promise<{ statusCode: number; body: string }> {
  const window = data.options?.window;

  logger.info(
    {
      subcommand: data.subcommand, // Fully typed: "leet" | "leeb" | "failed_leet"
      window: window, // Using type assertion temporarily
    },
    "Processing ranking command",
  );

  const messageTypeMap = {
    leet: MessageTypes.LEET,
    leeb: MessageTypes.LEEB,
    failed_leet: MessageTypes.FAILED_LEET,
  } as const;

  const messageType = messageTypeMap[data.subcommand];
  const { startDate, endDate } = getDateRange(window);

  let responseContent = "No data available";

  if (interaction.guild_id) {
    const guildMessages = await getGuildMessages({
      tableName: process.env.TABLE_NAME,
      guildId: interaction.guild_id,
      type: messageType,
      startDate,
      endDate,
    });

    const messagesByUser: Map<Message["userId"], Message[]> =
      guildMessages.reduce((acc, message) => {
        const existing = acc.get(message.userId) ?? [];
        acc.set(message.userId, [...existing, message]);
        return acc;
      }, new Map<Message["userId"], Message[]>());

    const guildMembers = await getGuildMembersByGuildId({
      tableName: process.env.TABLE_NAME,
      guildId: interaction.guild_id,
    });

    const userMap: Map<User["id"], User> = new Map(
      guildMembers.map((u) => [u.id, u]),
    );

    const rankings = [...messagesByUser.entries()]
      .sort(([, a], [, b]) => b.length - a.length)
      .map(
        ([userId, messages], index) =>
          `${index + 1}. ${userMap.get(userId)?.displayName ?? "Unknown User"}: ${messages.length}`,
      );

    const windowText = getWindowDisplayText(window);
    responseContent = `**${data.subcommand.toUpperCase()} Rankings** ${windowText}\n\n${rankings.join("\n")}`;
  }

  const result = await updateOriginalResponse(interaction, {
    content: responseContent,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send Discord response");
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, discordResponse: result.status }),
  };
}
