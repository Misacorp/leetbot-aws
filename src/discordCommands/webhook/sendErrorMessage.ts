import logger from "@logger";
import { APIInteraction } from "discord-api-types/v10";
import { updateOriginalResponse } from "./updateOriginalResponse";

/**
 * Sends an error message to Discord
 */
export const sendErrorMessage = async (
  interaction: APIInteraction,
  errorMessage: string = "🤖 I am a bad robot and can't do what you asked. Please let my maintenance team know.",
): Promise<void> => {
  try {
    await updateOriginalResponse({
      interaction: interaction,
      payload: {
        content: errorMessage,
      },
    });
  } catch (webhookError) {
    logger.error(
      {
        error: webhookError,
        interactionId: interaction.id,
      },
      "Failed to send error message to Discord",
    );
  }
};
