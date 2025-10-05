import logger from "@logger";
import {
  type APIMessageComponentInteraction,
  type RESTPostAPIWebhookWithTokenJSONBody,
} from "discord-api-types/v10";
import { getFromCache } from "@/src/util/cache";
import { decodeMakePublicPayload } from "@/src/discord/interactions/components/makePublicButton";
import { updateOriginalResponse } from "@/src/discord/interactions/webhook/updateOriginalResponse";
import { deleteEphemeralMessage } from "@/src/discord/interactions/webhook/deleteEphemeralMessage";
import { postMessage } from "@/src/discord/interactions/webhook/postMessage";
import { deleteMessage } from "@/src/discord/interactions/webhook/deleteMessage";
import { getParameter } from "@/src/util/ssm";
import { getSecret } from "@/src/util/secrets";
import { ensureEnvironmentVariable } from "@/src/discord/interactions/utils/validateInteractions";

/**
 * Handles clicks on "Make Public" buttons attached to responses to interactions.
 * @param interaction Button click interaction
 */
export const makePublicHandler = async ({
  interaction,
}: {
  interaction: APIMessageComponentInteraction;
}) => {
  // Ensure environment variables are present
  const [botTokenSecretId, applicationIdParamName] = await Promise.all([
    ensureEnvironmentVariable(interaction, "TOKEN_SECRET_ID"),
    ensureEnvironmentVariable(interaction, "APPLICATION_ID_PARAM_NAME"),
  ]);
  if (!botTokenSecretId || !applicationIdParamName) {
    return;
  }

  const [, cacheId] = interaction.data.custom_id.split(":");

  const json = await getFromCache(cacheId);

  // If nothing is found in the cache, it's probably by design.
  // We wouldn't be able to edit the original messages at this point anyway.
  if (!json) {
    logger.info(
      "Tried to make an interaction public, but couldn't find its info from the cache. This is normal. We can't process requests like these that are older than 15 minutes due to Discord's tokens expiring.",
    );
    const userId = interaction.member?.user.id;

    const message = userId
      ? `<@${userId}> tried to share something, but sharing is no longer available. Try running the command again.`
      : `Someone tried to share something with you all, but I can't do that any more. Try running the original command again.`;

    await updateOriginalResponse({
      interaction,
      payload: { content: message },
    });

    return;
  }

  const info = decodeMakePublicPayload(json);

  // Get bot token and application id
  const botToken = await getSecret(botTokenSecretId);
  const applicationId = await getParameter(applicationIdParamName, true);

  await Promise.all([
    // Delete the original interaction response (to which the "make public" button was attached)
    deleteEphemeralMessage({
      applicationId,
      token: info.token,
    }),
    // Remove the deferred response sent by the interaction ingress
    deleteMessage({
      applicationId,
      token: interaction.token,
    }),
  ]);

  // Post an entirely new message (not linked to any previous messages)
  // similar to the previous command's output.
  const original = interaction.message;
  const payload: RESTPostAPIWebhookWithTokenJSONBody = {
    content: `<@${interaction.member?.user.id}> used \`/${info.commandName}\`\n${original.content}`,
    embeds: original.embeds,
    allowed_mentions: { parse: [] },
    components: undefined, // Strip out the "Make Public" button
  };

  await postMessage({
    applicationId,
    botToken,
    channelId: interaction.channel.id,
    payload,
    ephemeral: false,
  });
};
