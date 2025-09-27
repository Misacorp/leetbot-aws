import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { parseCommandOptions } from "./parser";
import { type CommandName } from "./types";
import {
  type RankingCommandData,
} from "../commands/ranking/schema";
import {
  type UserInfoCommandData,
} from "../commands/user/schema";

// Discriminated union of command data returned by the router
export type CommandData =
  | { command: "ranking"; data: RankingCommandData }
  | { command: "user"; data: UserInfoCommandData };

export function parseCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): CommandData | null {
  const commandName = interaction.data.name as CommandName;
  const topLevelOptions = interaction.data.options ?? [];
  const parsed = parseCommandOptions(topLevelOptions);

  switch (commandName) {
    case "ranking": {
      const rankingData = parseRankingFromParsed(parsed);
      return rankingData ? { command: "ranking", data: rankingData } : null;
    }
    case "user": {
      const userData = parseUserFromParsed(parsed);
      return userData ? { command: "user", data: userData } : null;
    }
    default: {
      const _exhaustive: never = commandName;
      return null;
    }
  }
}

function parseRankingFromParsed(parsed: ReturnType<typeof parseCommandOptions>): RankingCommandData | null {
  if (!parsed.subcommand) return null;

  return {
    subcommand: parsed.subcommand as RankingCommandData["subcommand"],
    window: parsed.options.get("window") as RankingCommandData["window"],
  };
}

function parseUserFromParsed(parsed: ReturnType<typeof parseCommandOptions>): UserInfoCommandData | null {
  const userId = parsed.options.get("username") as string | undefined;
  if (!userId) return null;

  return {
    userId,
    window: parsed.options.get("window") as UserInfoCommandData["window"],
  };
}

// Type guards to help route in handlers
export function isRankingCommand(
  commandData: CommandData,
): commandData is Extract<CommandData, { command: "ranking" }> {
  return commandData.command === "ranking";
}

export function isUserInfoCommand(
  commandData: CommandData,
): commandData is Extract<CommandData, { command: "user" }> {
  return commandData.command === "user";
}
