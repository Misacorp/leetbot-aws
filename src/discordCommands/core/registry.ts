import { RankingCommandSchema } from "../commands/ranking/schema";
import { UserInfoCommandSchema } from "../commands/user/schema";
import { type ParsedFromSchema } from "./schemaParser";

// Registry of all command schemas
export const COMMAND_SCHEMAS = {
  ranking: RankingCommandSchema,
  user: UserInfoCommandSchema,
} as const;

// For registration usage
export const ALL_COMMAND_SCHEMAS = Object.values(COMMAND_SCHEMAS);

// Auto-generated types from schemas
export type ParsedCommands = {
  [K in keyof typeof COMMAND_SCHEMAS]: {
    command: K;
    data: ParsedFromSchema<(typeof COMMAND_SCHEMAS)[K]>;
  };
};

// Union of all possible parsed command results
export type CommandData = ParsedCommands[keyof ParsedCommands];

// Type to extract command names
export type CommandName = keyof typeof COMMAND_SCHEMAS;
