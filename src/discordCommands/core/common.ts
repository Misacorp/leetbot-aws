import {
  type APIApplicationCommandStringOption,
  ApplicationCommandOptionType,
} from "discord-api-types/payloads/v10";

// Common choices for a time window option
export const windowChoices = [
  { name: "This Season", value: "this_season" as const },
  { name: "This Week", value: "this_week" as const },
  { name: "This Year", value: "this_year" as const },
  { name: "All Time", value: "all_time" as const },
] as const satisfies APIApplicationCommandStringOption["choices"];

// Export type for helper-functions
export type CommandWindow = (typeof windowChoices)[number]["value"];

// Time window option for a Discord interaction (slash command)
export const windowOption = {
  type: ApplicationCommandOptionType.String,
  name: "window",
  description: "Time window constraint for the query",
  required: false,
  choices: windowChoices,
} as const;
