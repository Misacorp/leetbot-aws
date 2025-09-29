import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";
import { CommandInputTagged } from "@/src/discordCommands/core/schemaParser";
import { windowOption } from "@/src/discordCommands/core/common";

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
    windowOption,
  ],
} as const satisfies RESTPostAPIApplicationCommandsJSONBody;

export type UserInfoCommand = CommandInputTagged<typeof UserInfoCommandSchema>;
