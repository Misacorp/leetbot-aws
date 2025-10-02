import {
  type RESTPostAPIApplicationCommandsJSONBody,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { CommandInputTagged } from "@/src/discord/interactions/core/schemaParser";
import { windowOption } from "@/src/discord/interactions/core/common";

export const RankingCommandSchema = {
  name: "ranking",
  description: "Get rankings for this server",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leet",
      description: "Show leet message rankings",
      options: [windowOption],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "leeb",
      description: "Show leeb message rankings",
      options: [windowOption],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: "failed_leet",
      description: "Show failed leet message rankings",
      options: [windowOption],
    },
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

export type RankingCommand = CommandInputTagged<typeof RankingCommandSchema>;
