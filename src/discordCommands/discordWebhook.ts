import logger from "@logger";
import {
  MessageFlags,
  Routes,
  APIEmbed,
  ComponentType,
} from "/opt/nodejs/discord";

export interface DiscordInteractionData {
  id: string;
  token: string;
  application_id: string;
  guild_id?: string;
  channel_id?: string;
  ephemeral?: boolean;
}

// Discord message payload interfaces
export interface DiscordMessagePayload {
  content?: string;
  embeds?: APIEmbed[];
  components?: any[];
  flags?: number;
}

export type DiscordUpdatePayload = DiscordMessagePayload;

export interface DiscordWebhookResponse {
  success: boolean;
  status?: number;
  error?: string;
}

/**
 * Builds the Discord webhook URL for updating the original interaction response
 */
export function buildWebhookUrl(applicationId: string, token: string): string {
  return `https://discord.com/api/v10${Routes.webhookMessage(applicationId, token, "@original")}`;
}

/**
 * Builds the Discord webhook URL for creating a followup message
 */
export function buildFollowupUrl(applicationId: string, token: string): string {
  return `https://discord.com/api/v10${Routes.webhook(applicationId, token)}`;
}

/**
 * Sends a response to Discord by updating the original deferred interaction
 */
export async function updateOriginalResponse(
  interaction: DiscordInteractionData,
  payload: DiscordUpdatePayload,
): Promise<DiscordWebhookResponse> {
  const { id, token, application_id, ephemeral } = interaction;

  // Apply an ephemeral flag if needed using Discord.js MessageFlags enum
  const finalPayload: DiscordUpdatePayload = {
    ...payload,
    flags: payload.flags ?? (ephemeral ? MessageFlags.Ephemeral : undefined),
  };

  const webhookUrl = buildWebhookUrl(application_id, token);

  logger.debug(
    {
      webhookUrl: webhookUrl.replace(token, "[TOKEN]"),
      payloadSize: JSON.stringify(finalPayload).length,
      interactionId: id,
    },
    "Sending Discord webhook response",
  );

  try {
    const response = await fetch(webhookUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          interactionId: id,
        },
        "Discord webhook response failed",
      );

      return {
        success: false,
        status: response.status,
        error: `Discord API error: ${response.status} ${response.statusText}`,
      };
    }

    logger.debug(
      {
        status: response.status,
        interactionId: id,
      },
      "Successfully sent Discord webhook response",
    );

    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    logger.error(
      {
        error,
        interactionId: id,
      },
      "Failed to send Discord webhook response",
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sends a followup message to Discord (creates a new message instead of updating)
 */
export async function sendFollowupMessage(
  interaction: DiscordInteractionData,
  payload: DiscordMessagePayload,
): Promise<DiscordWebhookResponse> {
  const { id, token, application_id, ephemeral } = interaction;

  const finalPayload: DiscordMessagePayload = {
    ...payload,
    flags: payload.flags ?? (ephemeral ? MessageFlags.Ephemeral : undefined),
  };

  const webhookUrl = buildFollowupUrl(application_id, token);

  logger.debug(
    {
      webhookUrl: webhookUrl.replace(token, "[TOKEN]"),
      interactionId: id,
    },
    "Sending Discord followup message",
  );

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          status: response.status,
          error: errorText,
          interactionId: id,
        },
        "Discord followup message failed",
      );

      return {
        success: false,
        status: response.status,
        error: `Discord API error: ${response.status} ${response.statusText}`,
      };
    }

    logger.debug(
      {
        status: response.status,
        interactionId: id,
      },
      "Successfully sent Discord followup message",
    );

    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    logger.error(
      {
        error,
        interactionId: id,
      },
      "Failed to send Discord followup message",
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sends an error message to Discord, with automatic fallback handling
 */
export async function sendErrorResponse(
  interaction: DiscordInteractionData,
  errorMessage: string = "❌ Sorry, there was an error processing your request. Please try again later.",
): Promise<void> {
  try {
    await updateOriginalResponse(interaction, {
      content: errorMessage,
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
}

/**
 * Helper to extract interaction data from EventBridge event
 */
export function extractInteraction(event: any): DiscordInteractionData {
  const interaction = event.interaction;
  return {
    id: interaction.id,
    token: interaction.token,
    application_id: interaction.application_id,
    guild_id: interaction.guild_id,
    channel_id: interaction.channel_id,
    ephemeral: interaction.ephemeral,
  };
}
