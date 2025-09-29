import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { CommandInputTagged } from "@/src/discordCommands/core/schemaParser";
import { windowOption } from "@/src/discordCommands/core/common";

export const UserInfoCommandSchema = {
  name: "user",
  description: "Get user info and stats",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: "username",
      description: "Server member whose stats to get",
      required: true,
    },
    windowOption,
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

export type UserInfoCommand = CommandInputTagged<typeof UserInfoCommandSchema>;
