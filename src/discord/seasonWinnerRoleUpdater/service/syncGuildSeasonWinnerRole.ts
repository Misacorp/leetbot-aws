import logger from "@logger";
import { getAllGuildMembers } from "@/src/discord/rest/guild/members";
import {
  addRoleToGuildMember,
  getGuildRole,
  removeRoleFromGuildMember,
} from "@/src/discord/rest/guild/roles";
import { resolveSeasonWinnerUserIds } from "./resolveSeasonWinnerUserIds";
import { countMessagesByUser } from "@/src/discord/utils/messageCounts";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { MessageTypes } from "@/src/types";
import type { REST } from "@/src/layers/discord/nodejs/discord";

/**
 * Reconciles a single guild's winner role to the resolved season winners.
 */
export const syncGuildSeasonWinnerRole = async ({
  rest,
  tableName,
  guildId,
  seasonWinnerRoleId,
  startDate,
  endDate,
  seasonKey,
}: {
  rest: REST;
  tableName: string;
  guildId: string;
  seasonWinnerRoleId: string;
  startDate: Date;
  endDate: Date;
  seasonKey: string;
}): Promise<void> => {
  await getGuildRole({
    rest,
    guildId,
    roleId: seasonWinnerRoleId,
  });

  const [messageCounts, guildMembers] = await Promise.all([
    countMessagesByUser(
      await getGuildMessages({
        tableName,
        guildId,
        type: MessageTypes.LEET,
        startDate,
        endDate,
      }),
    ),
    getAllGuildMembers({
      rest,
      guildId,
    }),
  ]);

  const winnerIds = resolveSeasonWinnerUserIds(messageCounts);
  const currentRoleHolderIds = guildMembers
    .filter((member) => member.roles.includes(seasonWinnerRoleId))
    .map((member) => member.user?.id)
    .filter((userId): userId is string => Boolean(userId));

  const currentRoleHolderIdSet = new Set(currentRoleHolderIds);
  const winnerIdSet = new Set(winnerIds);
  const usersToAdd = winnerIds.filter(
    (winnerId) => !currentRoleHolderIdSet.has(winnerId),
  );
  const usersToRemove = currentRoleHolderIds.filter(
    (currentRoleHolderId) => !winnerIdSet.has(currentRoleHolderId),
  );

  logger.info(
    {
      guildId,
      seasonKey,
      winnerIds,
      usersToAdd,
      usersToRemove,
    },
    "Synchronizing season winner role",
  );

  const roleUpdateResults = await Promise.allSettled([
    ...usersToAdd.map((userId) =>
      addRoleToGuildMember({
        rest,
        guildId,
        userId,
        roleId: seasonWinnerRoleId,
      }),
    ),
    ...usersToRemove.map((userId) =>
      removeRoleFromGuildMember({
        rest,
        guildId,
        userId,
        roleId: seasonWinnerRoleId,
      }),
    ),
  ]);

  const failedRoleUpdates = roleUpdateResults.filter(
    (result) => result.status === "rejected",
  );

  if (failedRoleUpdates.length > 0) {
    const errors = failedRoleUpdates.map((result) =>
      result.status === "rejected" ? String(result.reason) : "",
    );
    throw new Error(
      `Failed to synchronize role ${seasonWinnerRoleId} for guild ${guildId}: ${errors.join(" | ")}`,
    );
  }
};
