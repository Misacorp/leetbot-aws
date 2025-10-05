import logger from "@logger";
import {
  type APIEmbed,
  type APIInteraction,
  type APIMessage,
  MessageFlags,
  type RESTPatchAPIWebhookWithTokenMessageJSONBody,
} from "discord-api-types/v10";
import { combineMessageFlags } from "@/src/discord/interactions/webhook/common";

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
 * Sends a response to Discord by updating the original deferred interaction
 */
export const updateOriginalResponse = async ({
  interaction,
  payload,
  ephemeral = true,
}: UpdateOriginalResponseArgs): Promise<APIMessage> => {
  const { id, token, application_id } = interaction;
  const url = `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`;

  // Apply an ephemeral flag if needed
  const finalPayload: RESTPatchAPIWebhookWithTokenMessageJSONBody = {
    ...payload,
    flags: combineMessageFlags(
      payload.flags,
      ephemeral ? MessageFlags.Ephemeral : undefined,
    ),
  };

  logger.debug(
    {
      webhookUrl: url.replace(token, "[TOKEN]"),
      payloadSize: JSON.stringify(finalPayload).length,
      interactionId: id,
    },
    "Sending Discord webhook response",
  );

  const response = await fetch(url, {
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

  return (await response.json()) as APIMessage;
};
