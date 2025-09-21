import logger from "@logger";
import {
  extractInteraction,
  updateOriginalResponse,
  sendErrorResponse,
} from "./discordWebhook";

/**
 * Handles all speed-related Discord slash commands (fastest/slowest metrics).
 * Purpose: consume normalized EventBridge events and respond to Discord using the interaction token.
 */
export const handler = async (event: any) => {
  // The EventBridge rule forwards only `detail`, so `event` is already the detail object.
  const interaction = extractInteraction(event);
  const query = event.query;
  const { mode, metric, window } = query;

  logger.debug(
    {
      interactionId: interaction.id,
      guild: interaction.guild_id,
      channel: interaction.channel_id,
      mode,
      metric,
      window,
    },
    "Received speed query",
  );

  try {
    // Create response content
    const responseContent = `✅ Speed query received!\n\n**Mode:** ${mode}\n**Metric:** ${metric}\n**Window:** ${window}\n\n*This is a mock response - real implementation coming soon!*`;

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
        mode,
        metric,
        window,
      },
      "Failed to process speed query",
    );

    // Send error message to Discord
    await sendErrorResponse(
      interaction,
      "❌ Sorry, there was an error processing your speed query. Please try again later.",
    );

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
