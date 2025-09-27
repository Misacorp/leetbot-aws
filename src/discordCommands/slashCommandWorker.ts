import logger from "@logger";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import { sendErrorResponse } from "./discordWebhook";
import { isAPIChatInputCommandInteraction } from "@/src/discordCommands/typeGuards";
import { type APIInteraction } from "discord-api-types/v10";
import {
  parseCommand,
  isRankingCommand,
  isUserInfoCommand,
} from "./core/router";
import { handleRankingCommand } from "./commands/ranking/handler";
import { handleUserInfoCommand } from "./commands/user/handler";

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
      // Parse the command using type-safe routing
      const commandData = parseCommand(interaction);

      if (!commandData) {
        throw new Error("Failed to parse command");
      }

      logger.info({ command: commandData.command }, "Parsed command");

      // Type-safe routing
      if (isRankingCommand(commandData)) {
        return await handleRankingCommand(interaction, commandData.data);
      } else if (isUserInfoCommand(commandData)) {
        return await handleUserInfoCommand(interaction, commandData.data);
      }

      throw new Error(`Unknown command.`);
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
