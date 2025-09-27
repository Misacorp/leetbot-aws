import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import {
  type CommandData,
  type CommandName,
  type RankingCommandData,
  type UserInfoCommandData,
  type RankingSubcommand,
  type CommandWindow,
} from "./registration/commands";
import { parseCommandOptions } from "./parseCommandOptions";

// Type-safe command parser using the generic option parser
export function parseCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): CommandData | null {
  const commandName = interaction.data.name as CommandName;
  const topLevelOptions = interaction.data.options ?? [];
  const parsed = parseCommandOptions(topLevelOptions);

  switch (commandName) {
    case "ranking":
      const rankingData = parseRankingCommandFromOptions(parsed);
      return rankingData ? { command: "ranking", data: rankingData } : null;

    case "user":
      const userInfoData = parseUserInfoCommandFromOptions(parsed);
      return userInfoData ? { command: "user", data: userInfoData } : null;

    default:
      // TypeScript exhaustiveness check
      throw new Error(`Unknown command: ${commandName}`);
  }
}

// Convert generic parsed options to specific command data types
function parseRankingCommandFromOptions(
  parsed: ReturnType<typeof parseCommandOptions>,
): RankingCommandData | null {
  if (!parsed.subcommand) {
    return null;
  }

  const subcommand = parsed.subcommand as RankingSubcommand;
  const window = parsed.options.get("window") as CommandWindow | undefined;

  return {
    subcommand,
    window,
  };
}

function parseUserInfoCommandFromOptions(
  parsed: ReturnType<typeof parseCommandOptions>,
): UserInfoCommandData | null {
  const userId = parsed.options.get("username") as string | undefined;
  const window = parsed.options.get("window") as CommandWindow | undefined;

  if (!userId) {
    return null; // username is required
  }

  return {
    userId,
    window,
  };
}

// Type guards for narrowing the command data
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
