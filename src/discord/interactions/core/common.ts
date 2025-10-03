import {
  type APIApplicationCommandStringOption,
  ApplicationCommandOptionType,
} from "discord-api-types/payloads/v10";

// Common choices for a time window option
export const windowChoices = [
  { name: "this season (default)", value: "this_season" as const },
  { name: "this week", value: "this_week" as const },
  { name: "this year", value: "this_year" as const },
  { name: "all time", value: "all_time" as const },
] as const satisfies APIApplicationCommandStringOption["choices"];

// Export type for helper-functions
export type CommandWindow = (typeof windowChoices)[number]["value"];

// Time window option for a Discord interaction (slash command)
export const windowOption = {
  type: ApplicationCommandOptionType.String,
  name: "when",
  description: "Limit results to a specific time period",
  required: false,
  choices: windowChoices,
} as const;
