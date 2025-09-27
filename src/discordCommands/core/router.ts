import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { parseFromSchema } from "./schemaParser";
import {
  COMMAND_SCHEMAS,
  type CommandData,
  type CommandName,
} from "./registry";

// Schema-driven command parser - works for any command automatically!
export function parseCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): CommandData | null {
  const commandName = interaction.data.name as CommandName;
  const options = interaction.data.options ?? [];

  // Look up the schema for this command
  const schema = COMMAND_SCHEMAS[commandName];
  if (!schema) {
    return null;
  }

  // Parse using the schema - fully type-safe and automatic
  const parsedData = parseFromSchema(schema, options);
  if (!parsedData) {
    return null;
  }

  // Return discriminated union
  return {
    command: commandName,
    data: parsedData,
  } as CommandData;
}

// Auto-generated type guards based on registry
export function isRankingCommand(
  commandData: CommandData,
): commandData is Extract<CommandData, { command: "ranking" }> {
  return commandData.command === "ranking";
}

export function isUserInfoCommand(
  commandData: CommandData,
): commandData is Extract<CommandData, { command: "user" }> {
  return commandData.command === "user";
}

// Generic type guard factory for extensibility
export function isCommand<K extends CommandName>(
  commandData: CommandData,
  commandName: K,
): commandData is Extract<CommandData, { command: K }> {
  return commandData.command === commandName;
}
