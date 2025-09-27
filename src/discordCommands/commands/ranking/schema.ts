import {
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandOption,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { type CommandWindow } from "@/src/discordCommands/core/types";

export type RankingSubcommand = "leet" | "leeb" | "failed_leet";

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
