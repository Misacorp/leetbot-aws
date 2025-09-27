import {
  type RESTPostAPIApplicationCommandsJSONBody,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { type ParsedFromSchema } from "../../core/schemaParser";
import { stringOption } from "../../core/schemaParser";

const timeWindowOption = stringOption("window", "Time window for the ranking", {
  required: false,
  choices: [
    { name: "This Month", value: "this_month" },
    { name: "This Week", value: "this_week" },
    { name: "This Year", value: "this_year" },
    { name: "All Time", value: "all_time" },
  ] as const,
});

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

// Auto-generated from schema! No need to maintain this manually
export type RankingCommandData = ParsedFromSchema<typeof RankingCommandSchema>;
