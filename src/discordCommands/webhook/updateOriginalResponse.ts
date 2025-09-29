import logger from "@logger";
import {
  APIInteraction,
  MessageFlags,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  Routes,
} from "discord-api-types/v10";
import { DiscordWebhookResponse } from "./types";
import { combineMessageFlags } from "@/src/discordCommands/webhook/common";

interface UpdateOriginalResponseArgs {
  interaction: APIInteraction;
  payload: RESTPatchAPIWebhookWithTokenMessageJSONBody;
  ephemeral?: boolean;
}

/**
 * Builds the Discord webhook URL for updating the original interaction response
 */
export function buildWebhookUrl(applicationId: string, token: string): string {
  return `https://discord.com/api/v10${Routes.webhookMessage(applicationId, token, "@original")}`;
}

/**
 * Sends a response to Discord by updating the original deferred interaction
 */
export const updateOriginalResponse = async ({
  interaction,
  payload,
  ephemeral = true,
}: UpdateOriginalResponseArgs): Promise<DiscordWebhookResponse> => {
  const { id, token, application_id } = interaction;

  // Apply an ephemeral flag if needed using Discord.js MessageFlags enum
  const finalPayload: RESTPatchAPIWebhookWithTokenMessageJSONBody = {
    ...payload,
    flags: combineMessageFlags(
      payload.flags,
      ephemeral ? MessageFlags.Ephemeral : undefined,
    ),
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
};
