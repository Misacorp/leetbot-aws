/**
 * Sets the Discord channel ID where the season recap message is posted.
 * Run once per guild. Pass RECAP_CHANNEL_ID="" to clear the value.
 *
 * Example:
 *   ENVIRONMENT=dev GUILD_ID=123 RECAP_CHANNEL_ID=456 \
 *     aws-vault exec leetbot-dev -- ts-node scripts/setRecapChannelId.ts
 */
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { setGuildRecapChannelId } from "@/src/repository/guild/setGuildRecapChannelId";
import { getTableNameFromCdkOutputs } from "@/scripts/getTableNameFromCdkOutputs";

const environment = process.env.ENVIRONMENT;
const guildId = process.env.GUILD_ID;
const recapChannelId = process.env.RECAP_CHANNEL_ID || undefined;

if (!environment) {
  throw new Error(
    "ENVIRONMENT is not defined. Run with ENVIRONMENT=dev or ENVIRONMENT=prd.",
  );
}

if (!guildId) {
  throw new Error(
    "GUILD_ID is not defined. Pass the Discord guild ID through GUILD_ID.",
  );
}

const tableName = getTableNameFromCdkOutputs(environment);

async function main() {
  const guild = await getGuildById({ tableName, id: guildId! });

  if (!guild) {
    throw new Error(`Guild metadata not found for guild ${guildId}`);
  }

  await setGuildRecapChannelId({ tableName, guildId: guildId!, recapChannelId });

  console.log(
    recapChannelId
      ? `Configured recap channel ${recapChannelId} for guild ${guildId}`
      : `Cleared recap channel for guild ${guildId}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
