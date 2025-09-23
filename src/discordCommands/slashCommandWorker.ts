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
      // Flatten options to the value-bearing level and concatenate "name: value"
      const optionsConcat = (() => {
        const topLevel: APIApplicationCommandInteractionDataOption[] =
          (interaction.data
            ?.options as APIApplicationCommandInteractionDataOption[]) ?? [];

        if (topLevel.length === 0) return "";

        // If the first option is a subcommand group or subcommand, drill down to leaf options
        let leafOptions: APIApplicationCommandInteractionDataOption[] =
          topLevel;
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

        return valueOptions
          .map((o) => `${o.name}: ${String(o.value)}`)
          .join(" ");
      })();

      // Create response content
      const responseContent = `✅ Command received!\n\n${optionsConcat}\n\n*This is a mock response - real implementation coming soon!*`;

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
