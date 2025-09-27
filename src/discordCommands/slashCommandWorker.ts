import logger from "@logger";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import { sendErrorResponse } from "./discordWebhook";
import { isAPIChatInputCommandInteraction } from "@/src/discordCommands/typeGuards";
import { type APIInteraction } from "discord-api-types/v10";
import { handleRankingCommand } from "./commands/ranking/handler";
import { handleUserInfoCommand } from "./commands/user/handler";
import {
  normalizeChatInput,
  RankingCommandSchema,
  UserInfoCommandSchema,
} from "@/src/discordCommands/commands/user/schema";
import {
  type UserInfoCommand,
  type RankingCommand,
} from "./commands/user/schema";

/**
 * Schema-driven Discord slash command worker.
 * Commands are automatically parsed from their schemas - no manual parsing needed!
 */
export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    logger.debug({ record }, "Raw SQS record");
    const snsRecord = JSON.parse(record.body) as SNSMessage;
    const interaction = JSON.parse(snsRecord.Message) as APIInteraction;

    logger.debug(
      {
        interactionId: interaction.id,
        guild: interaction.guild_id,
        channel: interaction.channel_id,
        data: interaction.data,
      },
      "Received command",
    );

    if (!isAPIChatInputCommandInteraction(interaction)) {
      throw new Error("Invalid interaction type");
    }

    try {
      // Schema-driven parsing - fully automatic and type-safe!
      const commandName = interaction.data.name;

      switch (commandName) {
        case "user": {
          const data = normalizeChatInput(interaction, UserInfoCommandSchema);
          return await handleUserInfoCommand(interaction, data);
        }
        case "ranking": {
          const data = normalizeChatInput(interaction, RankingCommandSchema);
          return await handleRankingCommand(interaction, data);
        }
      }

      throw new Error(`Unknown command: ${commandName}`);
    } catch (error) {
      logger.error(
        {
          error: error,
          interactionId: interaction.id,
        },
        "Failed to process command",
      );

      await sendErrorResponse(
        interaction,
        "❌ Sorry, there was an error processing your command. Please try again later.",
      );

      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal server error" }),
      };
    }
  });

  await Promise.all(promises);
};
