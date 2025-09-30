import logger from "@logger";
import { APIInteraction, MessageFlags } from "discord-api-types/payloads/v10";
import {
  RESTPostAPIWebhookWithTokenJSONBody,
  Routes,
} from "discord-api-types/v10";
import { combineMessageFlags } from "@/src/discordCommands/webhook/common";

/**
 * Builds the Discord webhook URL for creating a followup message
 */
export function buildFollowupUrl(applicationId: string, token: string): string {
  return `https://discord.com/api/v10${Routes.webhook(applicationId, token)}`;
}

interface SendFollowupMessageArgs {
  interaction: APIInteraction;
  payload: RESTPostAPIWebhookWithTokenJSONBody;
  ephemeral?: boolean;
}

/**
 * Sends a followup message to Discord (creates a new message).
 */
export const sendFollowupMessage = async ({
  interaction,
  payload,
  ephemeral = true,
}: SendFollowupMessageArgs): Promise<void> => {
  const { id, token, application_id } = interaction;

  const finalPayload: RESTPostAPIWebhookWithTokenJSONBody = {
    ...payload,
    flags: combineMessageFlags(
      payload.flags,
      ephemeral ? MessageFlags.Ephemeral : undefined,
    ),
  };

  const webhookUrl = buildFollowupUrl(application_id, token);

  logger.debug(
    {
      webhookUrl: webhookUrl.replace(token, "[TOKEN]"),
      interactionId: id,
    },
    "Sending Discord followup message",
  );

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

    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}`,
    );
  }

  logger.debug(
    {
      status: response.status,
      interactionId: id,
    },
    "Successfully sent Discord followup message",
  );
};
