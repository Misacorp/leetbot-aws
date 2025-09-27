import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { type UserInfoCommandData } from "./schema";
import { updateOriginalResponse } from "../../discordWebhook";
import { getDateRange, getWindowDisplayText } from "../../utils/dateUtils";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import logger from "@logger";

export async function handleUserInfoCommand(
  interaction: APIChatInputApplicationCommandInteraction,
  data: UserInfoCommandData, // Auto-generated from schema!
): Promise<{ statusCode: number; body: string }> {
  const userId = data.options.username; // Discord User option provides the user ID
  const window = data.options.window;

  logger.info(
    {
      username: userId,
      window: window,
    },
    "Processing user info command",
  );

  const { startDate, endDate } = getDateRange(window);
  const windowText = getWindowDisplayText(window);

  let responseContent = "No user data available";

  if (interaction.guild_id) {
    const guildMembers = await getGuildMembersByGuildId({
      tableName: process.env.TABLE_NAME,
      guildId: interaction.guild_id,
    });

    const user = guildMembers.find((u) => u.id === userId); // Note: username is actually userId from Discord User option

    if (!user) {
      responseContent = "❌ User not found in this server.";
    } else {
      // Fetch statistics for this user across message types
      const messageTypes = [
        MessageTypes.LEET,
        MessageTypes.LEEB,
        MessageTypes.FAILED_LEET,
      ];

      const userStats = await Promise.all(
        messageTypes.map(async (messageType) => {
          const messages = await getGuildMessages({
            tableName: process.env.TABLE_NAME,
            guildId: interaction.guild_id!,
            type: messageType,
            startDate,
            endDate,
          });

          const userMessages = messages.filter(
            (m: Message) => m.userId === userId,
          );
          return { type: messageType, count: userMessages.length };
        }),
      );

      const statsText = userStats
        .map(({ type, count }) => `${type}: ${count}`)
        .join("\n");
      responseContent = `**User Info for ${user.displayName ?? user.username}** ${windowText}\n\n${statsText}`;
    }
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
