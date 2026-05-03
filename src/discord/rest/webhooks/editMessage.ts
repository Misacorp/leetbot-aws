import logger from "@logger";
import type { RESTPatchAPIWebhookWithTokenMessageJSONBody } from "discord-api-types/v10";

interface EditDiscordMessageArgs {
  // The Discord bot's application id
  applicationId: string;
  // Token from the original message, authorizing us to perform actions on that message
  token: string;
  // ID of the original message. Defaults to "@original".
  messageId: string;
  payload: RESTPatchAPIWebhookWithTokenMessageJSONBody;
}

export const editMessage = async ({
  applicationId,
  token,
  messageId = "@original",
  payload,
}: EditDiscordMessageArgs): Promise<void> => {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/${messageId}`;

  logger.debug(
    { url: url.replace(token, "[TOKEN]"), messageId },
    "Editing Discord message",
  );

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      { status: response.status, error: errorText, messageId },
      "Discord message PATCH failed",
    );
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}`,
    );
  }

  logger.debug(
    { status: response.status, messageId },
    "Successfully edited Discord message",
  );
};
