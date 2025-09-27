import {
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandOption,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";

export type RankingSubcommand = "leet" | "leeb" | "failed_leet";
export type CommandWindow =
  | "this_month"
  | "this_week"
  | "this_year"
  | "all_time";

const timeWindowOption: APIApplicationCommandOption = {
  type: ApplicationCommandOptionType.String,
  name: "window",
  description: "Time window for the ranking",
  required: false,
  choices: [
    { name: "This Month", value: "this_month" },
    { name: "This Week", value: "this_week" },
    { name: "This Year", value: "this_year" },
    { name: "All Time", value: "all_time" },
  ],
};

export const RankingCommandSchema = {
  name: "ranking",
  description: "Get ranking information",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leet",
      description: "Show leet message rankings",
      options: [timeWindowOption],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leeb",
      description: "Show leeb message rankings",
      options: [timeWindowOption],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "failed_leet",
      description: "Show failed leet message rankings",
      options: [timeWindowOption],
    },
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

export interface RankingCommandData {
  subcommand: RankingSubcommand;
  window?: CommandWindow;
}

export const UserInfoCommandSchema = {
  name: "user",
  description: "Get user information",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "username",
      description: "Username",
      required: true,
    },
    timeWindowOption,
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

export interface UserInfoCommandData {
  userId: string; // Discord user ID from the User option
  window?: CommandWindow;
}

// === COMMAND REGISTRY ===
// This creates a union type of all possible command data
export type CommandData =
  | { command: "ranking"; data: RankingCommandData }
  | { command: "user"; data: UserInfoCommandData };

// Extract the command names as a union type
export type CommandName = CommandData["command"];

// Registry of all command schemas
export const COMMAND_SCHEMAS = {
  ranking: RankingCommandSchema,
  user: UserInfoCommandSchema,
} as const;

// Type to get all schemas as an array (useful for registration)
export const ALL_COMMAND_SCHEMAS = Object.values(COMMAND_SCHEMAS);
