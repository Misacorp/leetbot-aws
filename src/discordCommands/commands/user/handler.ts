import logger from "@logger";
import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { getDateRange, getWindowDisplayText } from "../../utils/dateUtils";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { type MessageType, MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import { normalizeChatInput } from "@/src/discordCommands/core/schemaParser";
import { UserInfoCommand, UserInfoCommandSchema } from "./schema";
import { updateOriginalResponse } from "@/src/discordCommands/webhook/updateOriginalResponse";
import { DiscordWebhookResponse } from "@/src/discordCommands/webhook/types";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { findEmoji } from "@/src/util/emoji";
import { capitalize } from "@/src/util/format";
import { getUserMessagesByDateRange } from "@/src/repository/message/getUserMessagesByDateRange";

/**
 * Handles the Discord interaction (slash command) to get user info
 */
export async function handleUserInfoCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
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

  if (interaction.guild_id) {
    const [guildMembers, guild, userMessages] = await Promise.all([
      getGuildMembersByGuildId({
        tableName: process.env.TABLE_NAME, // TODO: Get this from a param
        guildId: interaction.guild_id,
      }),
      getGuildById({
        tableName: process.env.TABLE_NAME,
        id: interaction.guild_id,
      }),
      getUserMessagesByDateRange({
        tableName: process.env.TABLE_NAME,
        userId,
        guildId: interaction.guild_id,
        startDate,
        endDate,
      }),
    ]);

    const user = guildMembers.find((u) => u.id === userId);

    let result: DiscordWebhookResponse;

    if (!user) {
      result = await updateOriginalResponse({
        interaction,
        payload: {
          content: `Who? I don't know anyone with that name. Tell them to leet more.`,
        },
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return;
    }

    if (!userMessages) {
      result = await updateOriginalResponse({
        interaction,
        payload: {
          content: `Couldn't find any messages for that user 🥲`,
        },
      });
      if (!result.success) {
        throw new Error(result.error);
      }
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

    const leetEmojiId = guild
      ? findEmoji(guild, "leet")?.identifier
      : undefined;
    const leebEmojiId = guild
      ? findEmoji(guild, "leeb")?.identifier
      : undefined;

    result = await updateOriginalResponse({
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
                name: leetEmojiId ? `<:${leetEmojiId}>` : "LEET",
                value:
                  messagesByType.get(MessageTypes.LEET)?.length.toString() ??
                  "-",
                inline: true,
              },
              {
                name: leebEmojiId ? `<:${leebEmojiId}>` : "LEEB",
                value:
                  messagesByType.get(MessageTypes.LEEB)?.length.toString() ??
                  "-",
                inline: true,
              },
              {
                name: leetEmojiId ? `🤡` : "FAILED_LEET",
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

    if (!result.success) {
      throw new Error(result.error || "Failed to send Discord response");
    }
  }
}
