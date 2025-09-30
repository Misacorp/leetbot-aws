import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { getDateRange, getWindowDisplayText } from "../../utils/dateUtils";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import type { User } from "@/src/repository/user/types";
import logger from "@logger";
import {
  type RankingCommand,
  RankingCommandSchema,
} from "@/src/discordCommands/commands/ranking/schema";
import { normalizeChatInput } from "@/src/discordCommands/core/schemaParser";
import { updateOriginalResponse } from "@/src/discordCommands/webhook/updateOriginalResponse";
import {
  ensureGuildId,
  ensureTableName,
} from "@/src/discordCommands/utils/validateInteractions";

/**
 * Handles the Discord interaction (slash command) for ranking.
 */
export async function handleRankingCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const tableName = await ensureTableName(interaction);
  if (!tableName) {
    return;
  }
  const guildId = await ensureGuildId(interaction);
  if (!guildId) {
    return;
  }

  const data: RankingCommand = normalizeChatInput(
    interaction,
    RankingCommandSchema,
  );

  // `when` is the user-facing option name
  const window = data.options.when;

  logger.info(
    {
      subcommand: data.subcommand,
      window: window,
    },
    "Processing ranking command",
  );

  if (!data.subcommand) {
    await updateOriginalResponse({
      interaction: interaction,
      payload: {
        content: `No subcommand specified. Give me a leet, leeb or failed_leet`,
      },
    });
    return;
  }

  const messageTypeMap = {
    leet: MessageTypes.LEET,
    leeb: MessageTypes.LEEB,
    failed_leet: MessageTypes.FAILED_LEET,
  } as const;
  const messageType = messageTypeMap[data.subcommand];
  const { startDate, endDate } = getDateRange(window);

  const guildMessages = await getGuildMessages({
    tableName,
    guildId,
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
    tableName,
    guildId,
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
  const responseContent = `**${data.subcommand?.toUpperCase()} Rankings** ${windowText}\n\n${rankings.join("\n")}`;

  await updateOriginalResponse({
    interaction: interaction,
    payload: {
      content: responseContent,
    },
  });
}
