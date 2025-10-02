/**
 * Type guards for dealing with events from the Discord HTTP API.
 * Used with e.g., slash commands.
 */
import {
  InteractionType,
  type APIInteraction,
  type APIApplicationCommandInteraction,
  ApplicationCommandType,
  APIChatInputApplicationCommandInteraction,
} from "discord-api-types/v10";

export function isAPIApplicationCommandInteraction(
  i: APIInteraction,
): i is APIApplicationCommandInteraction {
  return i.type === InteractionType.ApplicationCommand;
}

export function isAPIChatInputCommandInteraction(
  i: APIInteraction,
): i is APIChatInputApplicationCommandInteraction {
  return (
    i.type === InteractionType.ApplicationCommand &&
    i.data?.type === ApplicationCommandType.ChatInput
  );
}
