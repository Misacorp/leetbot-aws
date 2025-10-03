import logger from "@logger";
import {
  APIEmbed,
  type APIChatInputApplicationCommandInteraction,
} from "discord-api-types/v10";
import { normalizeChatInput } from "@/src/discord/interactions/core/schemaParser";
import { updateOriginalResponse } from "@/src/discord/interactions/webhook/updateOriginalResponse";
import {
  ensureGuildId,
  ensureTableName,
} from "@/src/discord/interactions/utils/validateInteractions";
import {
  getDateRange,
  getWindowDisplayText,
} from "@/src/discord/interactions/utils/dateUtils";
import type { Message } from "@/src/repository/message/types";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import type { User } from "@/src/repository/user/types";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { getGuildUserById } from "@/src/repository/user/getGuildUserById";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { type RankingCommand, RankingCommandSchema } from "./schema";
import { createRankingFields } from "./createRankingFields";
import {
  createDateString,
  createEmojiString,
  getGameEmojis,
} from "@/src/discord/discordUtils";

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

  const messageType = data.subcommand;
  const { startDate, endDate } = getDateRange(window);
  const userId = interaction.member?.user.id;

  const [guildMessages, guildMembers, guild, user] = await Promise.all([
    getGuildMessages({
      tableName,
      guildId,
      type: messageType,
      startDate,
      endDate,
      // TODO: A narrow projection expression would optimize this query - maybe even COUNT
    }),
    getGuildMembersByGuildId({
      tableName,
      guildId,
    }),
    getGuildById({
      tableName,
      id: guildId,
    }),
    userId
      ? getGuildUserById({
          tableName,
          guildId,
          userId,
        })
      : Promise.resolve(null as User | null),
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

  // Emojis used in the final embed
  const { leetEmoji, leebEmoji, failedLeetEmoji } = getGameEmojis(guild);
  const subcommandToEmojiMap = {
    leet: leetEmoji,
    leeb: leebEmoji,
    failed_leet: failedLeetEmoji,
  };
  const targetEmoji = subcommandToEmojiMap[data.subcommand];
  const emojiString = createEmojiString(targetEmoji);
  const emojiUrl = targetEmoji?.imageUrl;

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

  await updateOriginalResponse({
    interaction: interaction,
    payload: {
      embeds: [
        {
          title: `${emojiString} Ranking`,
          description: `**Top 10** positions ${windowText}, which started ${createDateString(startDate, "R")}.`,
          timestamp: new Date().toISOString(),
          author: {
            name: guild.name,
            icon_url: guild.iconUrl ?? undefined,
          },
          color: 10181046,
          thumbnail: emojiUrl
            ? {
                url: emojiUrl,
              }
            : undefined,
          fields: createRankingFields(rankings),
          footer,
        },
      ],
    },
  });
}
