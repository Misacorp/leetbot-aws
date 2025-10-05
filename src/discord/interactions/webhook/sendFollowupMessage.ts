import { APIInteraction, MessageFlags } from "discord-api-types/payloads/v10";
import {
  RESTPostAPIWebhookWithTokenJSONBody,
  APIInteractionResponseChannelMessageWithSource,
  Routes,
} from "discord-api-types/v10";
import { combineMessageFlags } from "@/src/discord/interactions/webhook/common";

/**
 * Builds the Discord webhook URL for creating a followup message
 */
export function buildFollowupUrl(applicationId: string, token: string): string {
  return `https://discord.com/api/v10${Routes.webhook(applicationId, token)}`;
}

interface SendFollowupMessageArgs<T> {
  interaction: { id: string; token: string; application_id: string };
  payload: T;
  ephemeral?: boolean;
}

type AnyFollowupPayload =
  | RESTPostAPIWebhookWithTokenJSONBody
  | APIInteractionResponseChannelMessageWithSource;

export const sendFollowupMessage = async <T extends AnyFollowupPayload>({
  interaction,
  payload,
  ephemeral = true,
}: SendFollowupMessageArgs<T>): Promise<void> => {
  const { token, application_id } = interaction;

  // Normalize to webhook payload
  const normalized: RESTPostAPIWebhookWithTokenJSONBody = (() => {
    if (isChannelMessageWithSource(payload)) {
      const d = payload.data;
      return {
        content: d.content,
        embeds: d.embeds,
        components: d.components,
        allowed_mentions: d.allowed_mentions,
        flags: d.flags,
      };
    }
    return { ...payload };
  })();

  // Merge/override ephemeral flag
  let flags = normalized.flags;

  // Add or clear ephemeral depending on the arguments
  if (ephemeral) {
    flags = combineMessageFlags(flags, MessageFlags.Ephemeral);
  } else if (flags !== undefined) {
    flags &= ~MessageFlags.Ephemeral; // strip the bit if present
  }

  const finalPayload: RESTPostAPIWebhookWithTokenJSONBody = {
    ...normalized,
    flags,
  };

  const webhookUrl = buildFollowupUrl(application_id, token);

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(finalPayload),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(
      `Discord followup error: ${resp.status} ${resp.statusText} — ${err}`,
    );
  }
};

// Type guard
function isChannelMessageWithSource(
  obj: any,
): obj is APIInteractionResponseChannelMessageWithSource {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "data" in obj &&
    typeof obj.data === "object"
  );
}
