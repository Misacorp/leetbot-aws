import {
  type RESTPostAPIApplicationCommandsJSONBody,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { CommandInputTagged } from "@/src/discordCommands/core/schemaParser";

export const RankingCommandSchema = {
  name: "ranking",
  description: "Get ranking information",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leet",
      description: "Show leet message rankings",
      options: [
        {
          type: ApplicationCommandOptionType.String as const,
          name: "window",
          description: "Time window constraint for the query",
          required: false,
          choices: [
            { name: "This Month", value: "this_month" },
            { name: "This Week", value: "this_week" },
            { name: "This Year", value: "this_year" },
            { name: "All Time", value: "all_time" },
          ],
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leeb",
      description: "Show leeb message rankings",
      options: [
        {
          type: ApplicationCommandOptionType.String as const,
          name: "window",
          description: "Time window constraint for the query",
          required: false,
          choices: [
            { name: "This Month", value: "this_month" },
            { name: "This Week", value: "this_week" },
            { name: "This Year", value: "this_year" },
            { name: "All Time", value: "all_time" },
          ],
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "failed_leet",
      description: "Show failed leet message rankings",
      options: [
        {
          type: ApplicationCommandOptionType.String as const,
          name: "window",
          description: "Time window constraint for the query",
          required: false,
          choices: [
            { name: "This Month", value: "this_month" },
            { name: "This Week", value: "this_week" },
            { name: "This Year", value: "this_year" },
            { name: "All Time", value: "all_time" },
          ],
        },
      ],
    },
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

// ⚠️ Note the "Tagged" version is used.
export type RankingCommand = CommandInputTagged<typeof RankingCommandSchema>;
