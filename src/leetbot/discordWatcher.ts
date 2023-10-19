import type { Context, ScheduledEvent } from "aws-lambda";
import { Client, Events, IntentsBitField } from "/opt/nodejs/discord";
import keepAlive from "./util/keepAlive";
import { getSecret } from "./util/secrets";
import { leetHandler } from "./messageHandlers/leetHandler";
import { leebHandler } from "./messageHandlers/leebHandler";
import { failedLeetHandler } from "./messageHandlers/failedLeetHandler";
import { unrelatedHandler } from "./messageHandlers/unrelatedHandler";

const messageHandlers = [
  leetHandler,
  leebHandler,
  failedLeetHandler,
  unrelatedHandler,
];

export const handler = async (event: ScheduledEvent, context: Context) => {
  // SQS setup
  const queueUrl = process.env.QUEUE_URL!;

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
    // Run the message through all message handlers simultaneously
    await Promise.all(
      messageHandlers.map((messageHandler) =>
        messageHandler(message, queueUrl),
      ),
    );
  });

  // Log in to Discord with your client's token
  console.info("Logging in to Discord…");
  await client.login(token);

  console.info("Starting keepAlive…");
  await keepAlive(event, context);

  console.info("Logging out of Discord…");
  await client.destroy();

  console.info("Exiting Lambda…");
};
