import logger from "@logger";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import {
  extractInteraction,
  updateOriginalResponse,
  sendErrorResponse,
} from "./discordWebhook";
import { isAPIChatInputCommandInteraction } from "@/src/discordCommands/typeGuards";
import {
  type APIInteraction,
  ApplicationCommandOptionType,
  type APIApplicationCommandInteractionDataOption,
  type APIApplicationCommandInteractionDataBasicOption,
} from "discord-api-types/v10";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { MessageType, MessageTypes } from "@/src/types";
import { Message } from "@/src/repository/message/types";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { User } from "@/src/repository/user/types";

/**
 * Handles all speed-related Discord slash commands (fastest/slowest metrics).
 * Purpose: consume normalized EventBridge events and respond to Discord using the interaction token.
 */
export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    logger.debug({ record }, "Raw SQS record");
    const snsRecord = JSON.parse(record.body) as SNSMessage;
    const interaction = JSON.parse(snsRecord.Message) as APIInteraction;

    logger.debug(interaction);

    logger.debug(
      {
        interactionId: interaction.id,
        guild: interaction.guild_id,
        channel: interaction.channel_id,
        data: interaction.data,
      },
      "Received speed query",
    );

    if (!isAPIChatInputCommandInteraction(interaction)) {
      throw new Error("yeet");
    }

    try {
      const topLevel: APIApplicationCommandInteractionDataOption[] =
        (interaction.data
          ?.options as APIApplicationCommandInteractionDataOption[]) ?? [];

      if (topLevel.length === 0) return "";

      // If the first option is a subcommand group or subcommand, drill down to leaf options
      let leafOptions: APIApplicationCommandInteractionDataOption[] = topLevel;
      const first = leafOptions[0];

      if (
        first &&
        first.type === ApplicationCommandOptionType.SubcommandGroup
      ) {
        const sub = first.options?.[0];
        leafOptions = sub?.options ?? [];
      } else if (
        first &&
        first.type === ApplicationCommandOptionType.Subcommand
      ) {
        leafOptions = first.options ?? [];
      }

      const valueOptions = leafOptions.filter(
        (o): o is APIApplicationCommandInteractionDataBasicOption =>
          "value" in o,
      );

      const optionsConcat = valueOptions
        .map((o) => `${o.name}: ${String(o.value)}`)
        .join(" ");

      let responseContent;

      const messageType =
        (valueOptions.find((option) => option.name === "type")
          ?.value as MessageType) ?? MessageTypes.LEET;
      const startDate = new Date(2025, 8, 22, 0, 0, 0, 0);
      const endDate = new Date();

      if (interaction.guild_id) {
        // Get messages in the guild
        const guildMessages = await getGuildMessages({
          tableName: process.env.TABLE_NAME,
          guildId: interaction.guild_id,
          type: messageType,
          startDate,
          endDate,
        });

        const messagesByUser: Map<Message["userId"], Message[]> =
          guildMessages.reduce((acc, message) => {
            const existingMessages = acc.get(message.userId) ?? [];
            const updatedMessages = [...existingMessages, message];
            acc.set(message.userId, updatedMessages);
            return acc;
          }, new Map<Message["userId"], Message[]>());

        // Get user info (for usernames etc.)
        const guildMembers = await getGuildMembersByGuildId({
          tableName: process.env.TABLE_NAME,
          guildId: interaction.guild_id,
        });
        const userMap: Map<User["id"], User> = new Map();
        guildMembers.forEach((guildMember) => {
          userMap.set(guildMember.id, guildMember);
        });

        const perUserMessages = [...messagesByUser.entries()].map(
          ([userId, messages]) =>
            `${userMap.get(userId)?.displayName ?? "Joku tuntematon rontti"}: ${messages.length}`,
        );

        responseContent = `${messageType} ranking from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}:\n${perUserMessages.join("\n")}`;
      }

      // Create response content
      responseContent =
        responseContent ??
        `✅ Command received!\n\n${optionsConcat}\n\n*This is a mock response - real implementation coming soon!*`;

      // Send response to Discord
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
    } catch (error) {
      logger.error(
        {
          error: error,
          interactionId: interaction.id,
        },
        "Failed to process speed query",
      );

      await sendErrorResponse(
        interaction,
        "❌ Sorry, there was an error processing your speed query. Please try again later.",
      );

      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  });

  await Promise.all(promises);
};
