import logger from "@logger";
import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { getDateRange, getWindowDisplayText } from "../../utils/dateWindow";
import { type MessageType, MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import { normalizeChatInput } from "@/src/discord/interactions/core/schemaParser";
import { UserInfoCommand, UserInfoCommandSchema } from "./schema";
import { updateOriginalResponse } from "@/src/discord/interactions/webhook/updateOriginalResponse";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { capitalize } from "@/src/util/format";
import { getUserMessagesByDateRange } from "@/src/repository/message/getUserMessagesByDateRange";
import { getGuildUserById } from "@/src/repository/user/getGuildUserById";
import {
  ensureGuildId,
  ensureEnvironmentVariable,
} from "@/src/discord/interactions/utils/validateInteractions";
import {
  createDateString,
  getEmojiStrings,
  getGameEmojis,
} from "@/src/discord/discordUtils";
import {
  calculateLongestStreak,
  formatStreakMessage,
} from "@/src/discord/interactions/utils/streak";
import { getFastestMessages } from "@/src/discord/interactions/utils/speed";

/**
 * Handles the Discord interaction (slash command) to get user info
 */
export async function handleUserInfoCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const [tableName, guildId] = await Promise.all([
    ensureEnvironmentVariable(interaction, "TABLE_NAME"),
    ensureGuildId(interaction),
  ]);
  if (!tableName || !guildId) {
    return;
  }

  const data: UserInfoCommand = normalizeChatInput(
    interaction,
    UserInfoCommandSchema,
  );

  // `username` is the user-facing option name, but it receives the user id as a value
  const userId = data.options.username;
  // `when` is the user-facing option name
  const window = data.options.when;

  logger.debug(
    {
      username: userId,
      window: window,
    },
    "Processing user info command",
  );

  const { startDate, endDate } = getDateRange(window);
  const windowText = getWindowDisplayText(window);

  // Get all the data we need
  const [user, guild, userMessages] = await Promise.all([
    getGuildUserById({
      tableName,
      userId,
      guildId,
    }),
    getGuildById({
      tableName,
      id: guildId,
    }),
    getUserMessagesByDateRange({
      tableName,
      userId,
      guildId,
      startDate,
      endDate,
    }),
  ]);

  if (!user) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content: `Who? I don't know anyone with that name. Tell them to leet more.`,
      },
    });

    return;
  }

  if (!userMessages || userMessages.length === 0) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content: `Couldn't find any messages for that user 🥲`,
      },
    });

    return;
  }

  // Sort all the user's messages by type
  const messagesByType: Map<MessageType, Message[]> = new Map();
  userMessages.forEach((message) => {
    messagesByType.set(message.messageType, [
      ...(messagesByType.get(message.messageType) ?? []),
      message,
    ]);
  });
  const leetMessages = messagesByType.get(MessageTypes.LEET);

  // Fastest LEET
  const fastest = leetMessages ? getFastestMessages(leetMessages) : undefined;

  // Longest LEET streak
  const longestStreak = calculateLongestStreak(leetMessages ?? []);

  // Emoji string representations
  const { leet, leeb, failed_leet } = getGameEmojis(guild);
  const [
    leetEmojiString = "LEET",
    leebEmojiString = "LEEB",
    failedLeetEmojiString = "FAILED_LEET",
  ] = getEmojiStrings([leet, leeb, failed_leet]);

  await updateOriginalResponse({
    interaction,
    payload: {
      embeds: [
        {
          title: `Stats for ${windowText}`,
          description:
            window === "all_time"
              ? undefined // It's silly to say when "all time" started
              : `${capitalize(windowText)} started ${createDateString(startDate, "R")}.`,
          timestamp: new Date().toISOString(),
          author: {
            name: user.displayName ?? user.username,
            icon_url: user.avatarUrl ?? undefined,
          },
          color: 10181046,
          thumbnail: user.avatarUrl
            ? {
                url: user.avatarUrl,
              }
            : undefined,

          image: user?.bannerUrl
            ? {
                url: user.bannerUrl,
              }
            : undefined,
          footer: guild
            ? {
                text: guild.name,
                icon_url: guild.iconUrl ?? undefined,
              }
            : undefined,
          fields: [
            {
              name: leetEmojiString,
              value:
                messagesByType.get(MessageTypes.LEET)?.length.toString() ?? "-",
              inline: true,
            },
            {
              name: leebEmojiString,
              value:
                messagesByType.get(MessageTypes.LEEB)?.length.toString() ?? "-",
              inline: true,
            },
            {
              name: failedLeetEmojiString,
              value:
                messagesByType
                  .get(MessageTypes.FAILED_LEET)
                  ?.length.toString() ?? "-",
              inline: true,
            },
            {
              name: `Longest ${leetEmojiString} streak`,
              value: formatStreakMessage(longestStreak),
            },
            {
              name: `Fastest ${leetEmojiString}`,
              value: fastest
                ? `${fastest.ms} ms on ${fastest.messages
                    .map((msg) =>
                      createDateString(new Date(msg.createdAt), "D"),
                    )
                    .join(" and ")}.`
                : "There are no messages to call the fastest.",
            },
          ],
        },
      ],
    },
  });
}
