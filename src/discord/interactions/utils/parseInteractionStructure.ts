import {
  ApplicationCommandOptionType,
  type APIChatInputApplicationCommandInteraction,
  type APIApplicationCommandInteractionDataBasicOption,
} from "discord-api-types/v10";

export interface ParsedInteractionStructure {
  group: string | undefined;
  subcommand: string | undefined;
  options: APIApplicationCommandInteractionDataBasicOption[];
}

/**
 * Parses a chat input interaction to extract its command structure.
 * Preserves the hierarchy of Group → Subcommand → Options.
 * @param interaction Discord chat input interaction
 * @returns An object containing the group (if any), subcommand (if any) and the actual command options
 */
export function parseInteractionStructure(
  interaction: APIChatInputApplicationCommandInteraction,
): ParsedInteractionStructure {
  const topLevelOptions = interaction.data.options ?? [];

  // No options at all
  if (topLevelOptions.length === 0) {
    return { group: undefined, subcommand: undefined, options: [] };
  }

  const firstOption = topLevelOptions[0];

  // Check if the first option is a subcommand
  if (firstOption.type === ApplicationCommandOptionType.Subcommand) {
    return {
      group: undefined,
      subcommand: firstOption.name,
      options: firstOption.options ?? [],
    };
  }

  // Check if the first option is a subcommand group
  if (firstOption.type === ApplicationCommandOptionType.SubcommandGroup) {
    const subcommand = firstOption.options[0];

    return {
      group: firstOption.name,
      subcommand: subcommand.name,
      options: subcommand.options ?? [],
    };
  }

  // No subcommand - return all options as regular command options
  return {
    group: undefined,
    subcommand: undefined,
    options:
      topLevelOptions as APIApplicationCommandInteractionDataBasicOption[],
  };
}

/**
 * Formats an option value for metrics reporting.
 * User options are anonymized, other values are stringified.
 *
 * @param option - The command option to format
 * @returns A string representation suitable for metrics
 */
export function formatOptionValueForMetrics(
  option: APIApplicationCommandInteractionDataBasicOption,
): string {
  if (!("value" in option) || option.value === undefined) {
    return "not_provided";
  }

  // Anonymize user selections for privacy
  if (option.type === ApplicationCommandOptionType.User) {
    return "user_selected";
  }

  return String(option.value);
}
