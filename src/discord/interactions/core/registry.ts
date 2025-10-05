import { RankingCommandSchema } from "../commands/ranking/schema";
import { UserInfoCommandSchema } from "../commands/user/schema";

// Registry of all command schemas
export const COMMAND_SCHEMAS = {
  ranking: RankingCommandSchema,
  user: UserInfoCommandSchema,
} as const;
