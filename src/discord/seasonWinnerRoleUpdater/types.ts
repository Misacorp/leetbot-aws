import type { REST } from "/opt/nodejs/discord";

export interface SeasonWinnerRoleUpdateParams {
  action?: string;
  seasonKey?: string;
  source?: string;
}

export interface SeasonWinnerRoleSyncContext {
  rest: REST;
  tableName: string;
}
