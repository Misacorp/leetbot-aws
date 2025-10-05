import {
  type APIActionRowComponent,
  type APIButtonComponent,
  type APIChatInputApplicationCommandInteraction,
  ButtonStyle,
  ComponentType,
} from "discord-api-types/v10";
import { editMessage } from "@/src/discord/interactions/webhook/editMessage";
import { saveToCache } from "@/src/util/cache";

export interface MakePublicButtonInfo {
  token: string;
  commandName: string;
  messageId: string;
}

const encodeMakePublicPayload = (args: MakePublicButtonInfo): string =>
  JSON.stringify(args);

export const decodeMakePublicPayload = (args: string): MakePublicButtonInfo =>
  JSON.parse(args) as MakePublicButtonInfo;

/**
 * Creates a "Make Public" button component for Discord interaction responses.
 * Stores relevant data in the cache.
 * @param interaction Interaction the button is being attached to
 * @param messageId Id of the message the button is being attached to
 */
export const createMakePublicButton = async ({
  interaction,
  messageId,
}: {
  interaction: APIChatInputApplicationCommandInteraction;
  messageId: string;
}): Promise<APIActionRowComponent<APIButtonComponent>> => {
  // Cache the interaction token and any other useful data
  const cachePayload = {
    token: interaction.token,
    commandName: interaction.data.name,
    messageId,
  };

  const cacheId = await saveToCache(encodeMakePublicPayload(cachePayload));

  return {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        label: "Make Public",
        custom_id: `make_public:${cacheId}`,
      },
    ],
  };
};

/**
 * Edits an existing message by adding a "Make Public" button to it.
 * This might be overly complex, and we could just add the button to the original
 * response, but it's been proven to work.
 * @param interaction Discord interaction
 * @param messageId Message id to which the button is to be added
 */
export const addMakePublicButton = async ({
  interaction,
  messageId,
}: {
  interaction: APIChatInputApplicationCommandInteraction;
  messageId: string;
}): Promise<void> => {
  const buttonRow = await createMakePublicButton({
    interaction,
    messageId,
  });

  return editMessage({
    applicationId: interaction.application_id,
    token: interaction.token,
    messageId: "@original",
    payload: {
      components: [buttonRow],
      allowed_mentions: { parse: [] },
    },
  });
};
