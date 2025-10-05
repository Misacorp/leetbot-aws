import {
  type RESTPostAPIWebhookWithTokenJSONBody,
  MessageFlags,
} from "discord-api-types/v10";
import logger from "@logger";
import { combineMessageFlags } from "@/src/discord/interactions/webhook/common";

interface PostMessageArgsWithToken {
  applicationId: string;
  token: string;
  payload: RESTPostAPIWebhookWithTokenJSONBody;
  ephemeral?: boolean;
}

interface PostMessageArgsWithBotToken {
  applicationId: string;
  botToken: string;
  channelId: string;
  payload: RESTPostAPIWebhookWithTokenJSONBody;
  ephemeral?: boolean;
}

type PostMessageArgs = PostMessageArgsWithToken | PostMessageArgsWithBotToken;

/**
 * Post a message to Discord.
 * When given a `botToken` and `channelId`, the message will be 100% new and not linked to anything.
 * When using a `token` from a previous interaction, the message will be linked to the previous interaction.
 */
export const postMessage = async (args: PostMessageArgs): Promise<void> => {
  const { applicationId, payload, ephemeral = false } = args;

  // Always normalize flags based on ephemeral arg
  let flags = payload.flags;
  if (ephemeral) {
    flags = combineMessageFlags(flags, MessageFlags.Ephemeral);
  } else if (flags !== undefined) {
    flags &= ~MessageFlags.Ephemeral; // strip ephemeral if present
  }

  const finalPayload: RESTPostAPIWebhookWithTokenJSONBody = {
    ...payload,
    flags,
  };

  let webhookUrl: string;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if ("token" in args) {
    webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${args.token}`;
  } else {
    webhookUrl = `https://discord.com/api/v10/channels/${args.channelId}/messages`;
    headers.Authorization = `Bot ${args.botToken}`;
  }

  logger.debug(
    {
      webhookUrl:
        "token" in args
          ? webhookUrl.replace(args.token, "[TOKEN]")
          : webhookUrl,
    },
    "Posting Discord message",
  );

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(finalPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      {
        status: response.status,
        error: errorText,
      },
      "Discord message POST failed",
    );
    throw new Error(
      `Discord API error: ${response.status} ${response.statusText}`,
    );
  }

  logger.debug(
    {
      status: response.status,
    },
    "Successfully posted Discord message",
  );
};
