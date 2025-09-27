import {
  type RESTPostAPIApplicationCommandsJSONBody,
  type APIApplicationCommandOptionChoice,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import { ParsedFromSchema } from "@/src/discordCommands/core/schemaParser";

const TIME_WINDOW_VALUES = [
  "this_month",
  "this_week",
  "this_year",
  "all_time",
] as const;
export type TimeWindowValue = (typeof TIME_WINDOW_VALUES)[number];

const timeWindowChoices: APIApplicationCommandOptionChoice<TimeWindowValue>[] =
  [
    { name: "This Month", value: "this_month" },
    { name: "This Week", value: "this_week" },
    { name: "This Year", value: "this_year" },
    { name: "All Time", value: "all_time" },
  ];

const timeWindowOption = {
  type: ApplicationCommandOptionType.String as const,
  name: "window",
  description: "Time window for the ranking",
  required: false,
  choices: timeWindowChoices,
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

export type UserInfoCommandData = ParsedFromSchema<
  typeof UserInfoCommandSchema
>;
