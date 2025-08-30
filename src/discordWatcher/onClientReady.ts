import logger from "@logger";
import { type Client } from "/opt/nodejs/discord";
import type { Emoji, Guild } from "@/src/repository/guild/types";
import { upsertGuild } from "@/src/repository/guild/upsertGuild";
import type { SQSPoller } from "./sqsPoller";

const GUILD_ID = "215386000132669440";

/**
 * Client ready handler
 */
export const onClientReady = async ({
  client,
  tableName,
  sqsPoller,
}: {
  // Discord client
  client: Client<true>;
  tableName: string;
  // SQS poller for handling incoming events
  sqsPoller?: SQSPoller;
}) => {
  logger.info(`Logged in to Discord as ${client.user.tag}.`);

  const discordGuild = await client.guilds.fetch(GUILD_ID);
  logger.info(`Guild name: ${discordGuild.name}`);

  logger.info("Gathering guild emojis…");
  const emojiCollection = await discordGuild.emojis.fetch();
  const emojis: Emoji[] = Array.from(emojiCollection).map(([_, emoji]) => ({
    name: emoji.name,
    id: emoji.id,
    identifier: emoji.identifier,
    imageUrl: emoji.imageURL(),
  }));

  const guild: Guild = {
    id: discordGuild.id,
    name: discordGuild.name,
    iconUrl: discordGuild.iconURL(),
    emojis,
  };

  logger.info("Saving guild information to database…");
  logger.debug({ guild });
  await upsertGuild({ tableName, guild });

  if (sqsPoller) {
    logger.info("Starting SQS polling…");
    sqsPoller.startPolling(client);
  }
};
