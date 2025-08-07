import { type Client } from "/opt/nodejs/discord";

/**
 * Client ready handler
 * @param client Discord client
 */
export const onClientReady = async (client: Client<true>) => {
  console.info(`Logged in to Discord as ${client.user.tag}.`);

  const guild = await client.guilds.fetch("215386000132669440");
  console.info("Guild name:", guild.name);
};
