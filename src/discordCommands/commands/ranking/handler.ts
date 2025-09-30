import {
  APIEmbed,
  type APIChatInputApplicationCommandInteraction,
} from "discord-api-types/v10";
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
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { findEmoji } from "@/src/util/emoji";
import { getGuildUserById } from "@/src/repository/user/getGuildUserById";
import { createRankingFields } from "@/src/discordCommands/commands/ranking/createRankingFields";

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
    failed_leet: MessageTypes.FAILED_LEET, // From the user-facing options
  } as const;
  const messageType = messageTypeMap[data.subcommand];
  const { startDate, endDate } = getDateRange(window);

  const [guildMessages, guildMembers, guild] = await Promise.all([
    // TODO: A narrow projection expression would optimize this query
    getGuildMessages({
      tableName,
      guildId,
      type: messageType,
      startDate,
      endDate,
    }),
    getGuildMembersByGuildId({
      tableName,
      guildId,
    }),
    getGuildById({
      tableName,
      id: guildId,
    }),
  ]);

  if (!guild) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content:
          "🤖 Server info not found. There's nothing you can do about this so… try again? Let my creator know if it still doesn't work.",
      },
    });
    logger.warn({ guildId }, "No guild info found in DynamoDB");
    return;
  }

  // Sort messages by user
  const messagesByUser: Map<Message["userId"], Message[]> =
    guildMessages.reduce((acc, message) => {
      const existing = acc.get(message.userId) ?? [];
      acc.set(message.userId, [...existing, message]);
      return acc;
    }, new Map<Message["userId"], Message[]>());

  // Map user objects to user ids.
  // This allows us to access usernames, avatar urls, etc.
  const userMap: Map<User["id"], User> = new Map(
    guildMembers.map((u) => [u.id, u]),
  );

  const rankings = [...messagesByUser.entries()]
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([userId, messages]) => {
      const user = userMap.get(userId);
      const username = user?.displayName ?? user?.username ?? "Unknown user";
      return { name: username, id: userId, messageCount: messages.length };
    });

  const windowText = getWindowDisplayText(window);

  // Emoji string representations
  const leetEmojiId = guild ? findEmoji(guild, "leet")?.identifier : undefined;
  const leetEmojiString = leetEmojiId ? `<:${leetEmojiId}>` : "LEET";
  const leebEmojiId = guild ? findEmoji(guild, "leeb")?.identifier : undefined;
  const leebEmojiString = leebEmojiId ? `<:${leebEmojiId}>` : "LEEB";
  const subcommandToEmojiStringMap: Record<typeof data.subcommand, string> = {
    leet: leetEmojiString,
    leeb: leebEmojiString,
    failed_leet: "🤡",
  };
  const emojiString = subcommandToEmojiStringMap[data.subcommand];

  const userId = interaction.member?.user.id;
  // TODO: Move this into the Promise.all statement above
  // Info specific to the caller
  let user: User | null = null;
  if (userId) {
    user = await getGuildUserById({
      tableName,
      guildId,
      userId,
    });
  }

  let footer: APIEmbed["footer"] | undefined = undefined;
  if (user) {
    const userIndexOnRankings = rankings.findIndex((row) => row.id === user.id);
    if (userIndexOnRankings !== -1) {
      const messageCount = rankings[userIndexOnRankings].messageCount;

      footer = {
        text: `You are on position ${userIndexOnRankings + 1} with ${messageCount} ${data.subcommand}${messageCount !== 1 ? "s" : ""}.`,
        icon_url: user.avatarUrl ?? undefined,
      };
    }
  }

  const leetEmojiUrl =
    "https://cdn.discordapp.com/emojis/532902550593077249.webp";
  const leebEmojiUrl =
    "https://cdn.discordapp.com/emojis/549557200796778496.webp";
  const emojiUrl =
    data.subcommand === MessageTypes.LEET ? leetEmojiUrl : leebEmojiUrl;

  await updateOriginalResponse({
    interaction: interaction,
    payload: {
      embeds: [
        {
          title: `${emojiString} Ranking`,
          description: `**Top 10** positions ${windowText}, which started <t:${startDate.getTime() / 1000}:R>.`,
          timestamp: new Date().toISOString(),
          author: {
            name: guild.name,
            icon_url: guild.iconUrl ?? undefined,
          },
          color: 10181046,
          thumbnail: {
            url: emojiUrl,
          },
          fields: createRankingFields(rankings),
          footer,
        },
      ],
    },
  });
}
