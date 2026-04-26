import logger from "@logger";
import type { SNSEvent } from "aws-lambda";
import {
  isAPIChatInputCommandInteraction,
  isComponentInteraction,
} from "@/src/discord/interactions/typeGuards";
import { type APIInteraction } from "discord-api-types/v10";
import { handleRankingCommand } from "./commands/ranking/handler";
import { handleUserInfoCommand } from "./commands/user/handler";
import { sendErrorMessage } from "@/src/discord/interactions/webhook/sendErrorMessage";
import { makePublicHandler } from "@/src/discord/interactions/components/makePublicHandler";

/**
 * Discord interaction (slash command) worker.
 * Routes interactions to their own handlers.
 */
export const handler = async (event: SNSEvent): Promise<void> => {
  const promises = event.Records.map(
    async (record: SNSEvent["Records"][number]): Promise<void> => {
      logger.debug({ record }, "Raw SNS record");
      const interaction = JSON.parse(record.Sns.Message) as APIInteraction;

      logger.debug(
        {
          interactionId: interaction.id,
          guild: interaction.guild_id,
          channel: interaction.channel?.id,
          data: interaction.data,
        },
        "Received command",
      );

      try {
        if (isComponentInteraction(interaction)) {
          // Route by `custom_id`
          if (interaction.data.custom_id.startsWith("make_public")) {
            return await makePublicHandler({
              interaction,
            });
          }
        }

        // We only support certain types of interactions from here on out.
        // Return early if needed.
        if (!isAPIChatInputCommandInteraction(interaction)) {
          await sendErrorMessage(
            interaction,
            "🤖 I got your request but can't process it. Sorry!",
          );

          logger.warn(
            { interaction },
            "Invalid interaction type (not a APIChatInputCommandInteraction)",
          );

          return;
        }

        // Route by command name
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
          "🤖 Sorry, there was an error processing your command. Please let my creator know and maybe try again later.",
        );
      }
    },
  );

  // Treat each message in the batch independently
  await Promise.allSettled(promises);
};
