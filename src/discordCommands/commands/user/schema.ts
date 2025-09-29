import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import {
  CommandInput,
  CommandInputTagged,
} from "@/src/discordCommands/core/schemaParser";

export const UserInfoCommandSchema = {
  name: "user",
  description: "Get user information",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "username",
      description: "Discord user to get information about",
      required: true,
    },
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
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

// TODO: Rename these
export type UserInfoCommand = CommandInputTagged<typeof UserInfoCommandSchema>;
