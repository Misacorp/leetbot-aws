/**
 * Sets the ID of the season winner's role for a given guild.
 * This is mostly a one-time setup operation, done once for each guild.
 */
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { setGuildSeasonWinnerRoleId } from "@/src/repository/guild/setGuildSeasonWinnerRoleId";
import { getTableNameFromCdkOutputs } from "@/scripts/getTableNameFromCdkOutputs";

const environment = process.env.ENVIRONMENT;
const guildId = process.env.GUILD_ID;
const seasonWinnerRoleId = process.env.SEASON_WINNER_ROLE_ID;

if (!environment) {
  throw new Error(
    "ENVIRONMENT is not defined. Run with something like ENVIRONMENT=dev aws-vault exec leetbot-dev -- ts-node scripts/setSeasonWinnerRoleId.ts",
  );
}

if (!guildId) {
  throw new Error(
    "GUILD_ID is not defined. Pass the Discord guild id through GUILD_ID.",
  );
}

const resolvedEnvironment = environment;
const resolvedGuildId = guildId;
const tableName = getTableNameFromCdkOutputs(resolvedEnvironment);

async function main() {
  const guild = await getGuildById({
    tableName,
    id: resolvedGuildId,
  });

  if (!guild) {
    throw new Error(`Guild metadata not found for guild ${resolvedGuildId}`);
  }

  await setGuildSeasonWinnerRoleId({
    tableName,
    guildId: resolvedGuildId,
    seasonWinnerRoleId,
  });

  console.log(
    seasonWinnerRoleId
      ? `Configured season winner role ${seasonWinnerRoleId} for guild ${resolvedGuildId}`
      : `Cleared season winner role for guild ${resolvedGuildId}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
