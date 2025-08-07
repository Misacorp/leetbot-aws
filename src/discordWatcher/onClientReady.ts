import { type Client } from "/opt/nodejs/discord";
import type { Emoji, Guild } from "../repository/guild/types";
import { upsertGuild } from "../repository/guild/upsertGuild";

const GUILD_ID = "215386000132669440";

/**
 * Client ready handler
 * @param client Discord client
 */
export const onClientReady = async (client: Client<true>) => {
  console.info(`Logged in to Discord as ${client.user.tag}.`);

  const discordGuild = await client.guilds.fetch(GUILD_ID);
  console.info("Guild name:", discordGuild.name);

  console.debug("Gathering guild emojis…");
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

  console.info("Saving guild info to database…", guild);
  await upsertGuild(guild);
};
