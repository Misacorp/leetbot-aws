import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";

/**
 * Builds a minimal API Gateway/Lambda proxy JSON response.
 */
export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * Responds to a Discord PING with a PONG.
 * Used for Discord's verification process.
 */
export const discordPong = () =>
  json(200, { type: InteractionResponseType.Pong });

/**
 * Responds with a deferred ephemeral message.
 * Shows a private loading indicator that only the command user can see.
 * Use this when you need time to process the command asynchronously.
 */
export const discordDeferEphemeral = () =>
  json(200, {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral },
  });

/**
 * Responds with a deferred public message.
 * Shows a loading indicator that everyone in the channel can see.
 * Use this when the response should be visible to all users.
 */
export const discordDeferPublic = () =>
  json(200, {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
  });

/**
 * Responds with an immediate ephemeral message.
 * The message is only visible to the user who triggered the interaction.
 *
 * @param content - The message content to send
 */
export const discordReplyEphemeral = (content: string) =>
  json(200, {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content,
      flags: MessageFlags.Ephemeral,
    },
  });

/**
 * Responds with an immediate public message.
 * The message is visible to everyone in the channel.
 *
 * @param content - The message content to send
 */
export const discordReplyPublic = (content: string) =>
  json(200, {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content },
  });

/**
 * Returns a Discord authentication error (401).
 * Use this when signature verification fails or headers are missing.
 *
 * @param message - Error message to include in the response
 */
export const discordAuthError = (message: string) =>
  json(401, { error: message });
