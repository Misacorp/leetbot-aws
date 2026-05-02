import { Routes, type REST } from "/opt/nodejs/discord";
import type { RESTGetAPIGuildRoleResult } from "discord-api-types/v10";

/**
 * Ensures the configured role exists in the target guild.
 */
export const getGuildRole = async ({
  rest,
  guildId,
  roleId,
}: {
  rest: REST;
  guildId: string;
  roleId: string;
}): Promise<RESTGetAPIGuildRoleResult> =>
  (await rest.get(
    Routes.guildRole(guildId, roleId),
  )) as RESTGetAPIGuildRoleResult;

/**
 * Adds a role to a guild member.
 */
export const addRoleToGuildMember = ({
  rest,
  guildId,
  userId,
  roleId,
}: {
  rest: REST;
  guildId: string;
  userId: string;
  roleId: string;
}) => rest.put(Routes.guildMemberRole(guildId, userId, roleId));

/**
 * Removes a role from a guild member.
 */
export const removeRoleFromGuildMember = ({
  rest,
  guildId,
  userId,
  roleId,
}: {
  rest: REST;
  guildId: string;
  userId: string;
  roleId: string;
}) => rest.delete(Routes.guildMemberRole(guildId, userId, roleId));
