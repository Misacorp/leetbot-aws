import logger from "@logger";
import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { getDateRange, getWindowDisplayText } from "../../utils/dateUtils";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { type MessageType, MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import { normalizeChatInput } from "@/src/discordCommands/core/schemaParser";
import { UserInfoCommand, UserInfoCommandSchema } from "./schema";
import { updateOriginalResponse } from "@/src/discordCommands/webhook/updateOriginalResponse";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { findEmoji } from "@/src/util/emoji";
import { capitalize } from "@/src/util/format";
import { getUserMessagesByDateRange } from "@/src/repository/message/getUserMessagesByDateRange";
import { getGuildUserById } from "@/src/repository/user/getGuildUserById";
import {
  ensureGuildId,
  ensureTableName,
} from "@/src/discordCommands/utils/validateInteractions";

/**
 * Handles the Discord interaction (slash command) to get user info
 */
export async function handleUserInfoCommand(
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

  if (!userMessages) {
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

  // Emoji string representations
  const leetEmojiId = guild ? findEmoji(guild, "leet")?.identifier : undefined;
  const leetEmojiString = leetEmojiId ? `<:${leetEmojiId}>` : "LEET";
  const leebEmojiId = guild ? findEmoji(guild, "leeb")?.identifier : undefined;
  const leebEmojiString = leebEmojiId ? `<:${leebEmojiId}>` : "LEEB";

  await updateOriginalResponse({
    interaction,
    payload: {
      embeds: [
        {
          title: `Stats for ${windowText}`,
          description: `${capitalize(windowText)} started <t:${startDate.getTime() / 1000}:R>.`,
          timestamp: new Date().toISOString(),
          author: {
            name: user.displayName ?? user.username,
            icon_url: user.avatarUrl ?? undefined,
          },
          color: 10181046,
          thumbnail: {
            url: "https://cdn.discordapp.com/emojis/532902550593077249.webp", // Leet emoji
          },
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
              name: "🤡",
              value:
                messagesByType
                  .get(MessageTypes.FAILED_LEET)
                  ?.length.toString() ?? "-",
              inline: true,
            },
          ],
        },
      ],
    },
  });
}
