import logger from "@logger";
import {
  APIEmbed,
  APIInteraction,
  MessageFlags,
  RESTPatchAPIWebhookWithTokenMessageJSONBody,
  Routes,
} from "discord-api-types/v10";
import { combineMessageFlags } from "@/src/discordCommands/webhook/common";

export interface UpdateOriginalResponseArgs {
  interaction: Pick<APIInteraction, "id" | "token" | "application_id">;
  payload: RESTPatchAPIWebhookWithTokenMessageJSONBody &
    (
      | {
          content?: string;
        }
      | {
          embeds?: APIEmbed[];
        }
    );
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
}: UpdateOriginalResponseArgs): Promise<void> => {
  const { id, token, application_id } = interaction;

  // Apply an ephemeral flag if needed
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

    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}`,
    );
  }

  logger.debug(
    {
      status: response.status,
      interactionId: id,
    },
    "Successfully sent Discord webhook response",
  );
};
