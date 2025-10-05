/**
 * Type guards for dealing with events from the Discord HTTP API.
 * Used with e.g., slash commands.
 */
import {
  ApplicationCommandType,
  type APIInteraction,
  type APIChatInputApplicationCommandInteraction,
  type APIMessageComponentInteraction,
  InteractionType,
} from "discord-api-types/v10";

export function isAPIChatInputCommandInteraction(
  i: APIInteraction,
): i is APIChatInputApplicationCommandInteraction {
  return (
    i.type === InteractionType.ApplicationCommand &&
    i.data?.type === ApplicationCommandType.ChatInput
  );
}

export function isComponentInteraction(
  interaction: unknown,
): interaction is APIMessageComponentInteraction {
  return (
    typeof interaction === "object" &&
    interaction !== null &&
    "type" in interaction &&
    (interaction as any).type === InteractionType.MessageComponent
  );
}
