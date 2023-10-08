import type { Context } from "aws-lambda";
import { Client, Events, IntentsBitField } from "/opt/nodejs/discordSdkLayer";
import keepAlive from "./util/keepAlive";
import { getSecret } from "./util/secrets";

export const handler = async (event: unknown, context: Context) => {
  // Get Discord bot token
  const token = await getSecret(process.env.TOKEN_SECRET_ID!);

  const client = new Client({
    intents: new IntentsBitField()
      .add(IntentsBitField.Flags.Guilds)
      .add(IntentsBitField.Flags.GuildMessages)
      .add(IntentsBitField.Flags.MessageContent),
    closeTimeout: 300,
  });

  client.once(Events.ClientReady, async (c) => {
    console.info(`Logged in to Discord as ${c.user.tag}.`);

    const guild = await client.guilds.fetch("215386000132669440");
    console.info("Guild name:", guild.name);
  });

  client.once(Events.Error, (error) => {
    console.warn("Client exited with the following error:");
    console.error(error);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.content.includes("leet")) {
      message.react("👀");
      console.info(
        "Reacted to leet with",
        context.getRemainingTimeInMillis(),
        "ms remaining",
      );
    }
  });

  // Log in to Discord with your client's token
  console.info("Logging in to Discord…");
  await client.login(token);

  console.info("Starting keepAlive…");
  await keepAlive(context);

  console.info("Logging out of Discord…");
  await client.destroy();

  console.info("Exiting Lambda…");
};
