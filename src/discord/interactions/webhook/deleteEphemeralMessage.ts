import logger from "@logger";

/**
 * Deletes an ephemeral message created via an interaction.
 * Works only within 15 minutes of the interaction and only via the interaction token.
 */
interface DeleteEphemeralMessageArgs {
  // Discord bot application ID
  applicationId: string;
  // Interaction token
  token: string;
  // Defaults to "@original"
  messageId?: string;
}

export const deleteEphemeralMessage = async ({
  applicationId,
  token,
  messageId = "@original",
}: DeleteEphemeralMessageArgs): Promise<void> => {
  const url = `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/${messageId}`;

  logger.debug(
    { url: url.replace(token, "[TOKEN]"), messageId },
    "Deleting ephemeral Discord message",
  );

  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      {
        status: response.status,
        error: errorText,
        messageId,
      },
      "Failed to delete ephemeral message",
    );
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}`,
    );
  }

  logger.debug(
    { status: response.status, messageId },
    "Successfully deleted ephemeral Discord message",
  );
};
