import logger from "@logger";

interface DeleteDiscordMessageArgs {
  // The Discord bot's application id
  applicationId: string;
  // Token from the original message, authorizing us to perform actions on that message
  token: string;
  // ID of the original message. Defaults to "@original".
  messageId?: string;
}

export const deleteMessage = async ({
  applicationId,
  token,
  messageId = "@original",
}: DeleteDiscordMessageArgs): Promise<void> => {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/${messageId}`;

  logger.debug(
    {
      url: url.replace(token, "[TOKEN]"),
      messageId,
    },
    "Deleting Discord message",
  );

  const response = await fetch(url, { method: "DELETE" });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      {
        status: response.status,
        error: errorText,
        messageId,
      },
      "Discord message DELETE failed",
    );
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}`,
    );
  }

  logger.debug(
    {
      status: response.status,
      messageId,
    },
    "Successfully deleted Discord message",
  );
};
