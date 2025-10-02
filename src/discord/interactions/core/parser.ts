import {
  type APIApplicationCommandInteractionDataOption,
  type APIApplicationCommandInteractionDataBasicOption,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";

export interface ParsedCommandOptions {
  subcommand?: string;
  options: Map<string, string | number | boolean>;
}

/**
 * Generic parser for Discord slash command options that handles subcommands, subcommand groups, and basic options
 */
export function parseCommandOptions(
  topLevelOptions: APIApplicationCommandInteractionDataOption[] = [],
): ParsedCommandOptions {
  if (topLevelOptions.length === 0) {
    return { options: new Map() };
  }

  // If the first option is a subcommand group or subcommand, drill down to leaf options
  let leafOptions: APIApplicationCommandInteractionDataOption[] =
    topLevelOptions;
  const first = leafOptions[0];
  let subcommand: string | undefined;

  if (first && first.type === ApplicationCommandOptionType.SubcommandGroup) {
    const sub = first.options?.[0];
    leafOptions = sub?.options ?? [];
    subcommand = sub?.name;
  } else if (first && first.type === ApplicationCommandOptionType.Subcommand) {
    leafOptions = first.options ?? [];
    subcommand = first.name;
  }

  const valueOptions = leafOptions.filter(
    (o): o is APIApplicationCommandInteractionDataBasicOption => "value" in o,
  );

  const optionsMap = new Map<string, string | number | boolean>();
  valueOptions.forEach((option) => {
    optionsMap.set(option.name, option.value);
  });

  return {
    subcommand,
    options: optionsMap,
  };
}
