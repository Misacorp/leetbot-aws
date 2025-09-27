import {
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandOption,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { type CommandWindow } from "@/src/discordCommands/core/types";

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
    timeWindowOption,
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

export interface UserInfoCommandData {
  userId: string; // Discord user ID from the User option
  window?: CommandWindow;
}
