import logger from "@logger";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import { isAPIChatInputCommandInteraction } from "@/src/discord/interactions/typeGuards";
import { type APIInteraction } from "discord-api-types/v10";
import { handleRankingCommand } from "./commands/ranking/handler";
import { handleUserInfoCommand } from "./commands/user/handler";
import { sendErrorMessage } from "@/src/discord/interactions/webhook/sendErrorMessage";

/**
 * Discord interaction (slash command) worker.
 * Routes interactions to their own handlers.
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  const promises = event.Records.map(
    async (record: SQSRecord): Promise<void> => {
      logger.debug({ record }, "Raw SQS record");
      const snsRecord = JSON.parse(record.body) as SNSMessage;
      const interaction = JSON.parse(snsRecord.Message) as APIInteraction;

      logger.debug(
        {
          interactionId: interaction.id,
          guild: interaction.guild_id,
          channel: interaction.channel?.id,
          data: interaction.data,
        },
        "Received command",
      );

      // We only support certain types of interactions
      if (!isAPIChatInputCommandInteraction(interaction)) {
        await sendErrorMessage(
          interaction,
          "❌ Sorry, there was an error processing your command. Please try again later.",
        );

        logger.warn(
          { interaction },
          "Invalid interaction type (not a APIChatInputCommandInteraction)",
        );

        return;
      }

      try {
        const commandName = interaction.data.name;

        switch (commandName) {
          case "user": {
            return await handleUserInfoCommand(interaction);
          }
          case "ranking": {
            return await handleRankingCommand(interaction);
          }
          default: {
            return sendErrorMessage(interaction, "Unknown command");
          }
        }
      } catch (error) {
        logger.error(
          {
            error: error,
            interactionId: interaction.id,
          },
          "Failed to process command",
        );

        await sendErrorMessage(
          interaction,
          "❌ Sorry, there was an error processing your command. Please try again later.",
        );
      }
    },
  );

  // Treat each message in the batch independently
  await Promise.allSettled(promises);
};
