import type { Context, ScheduledEvent } from "aws-lambda";
import { Client, Events, IntentsBitField } from "/opt/nodejs/discord";
import keepAlive from "./util/lambda";
import { getSecret } from "./util/secrets";
import type { TestEvent } from "../types";
import { publishToDiscordOutTopic } from "./messageHandlers/publishToDiscordOutTopic";

/**
 * Discord watcher.
 * Listens to messages on a Discord server and forwards them for further processing.
 * @param event   Event that started the watcher.
 * @param context Lambda context
 */
export const handler = async (
  event: ScheduledEvent | TestEvent,
  context: Context,
) => {
  const token = await getSecret(process.env.TOKEN_SECRET_ID!);
  const client = new Client({
    intents: new IntentsBitField()
      .add(IntentsBitField.Flags.Guilds)
      .add(IntentsBitField.Flags.GuildMessages)
      .add(IntentsBitField.Flags.MessageContent),
    closeTimeout: 300,
  });

  initEventHandlers(client, event);

  // Start the bot lifecycle
  console.info("Logging in to Discord…");
  await client.login(token);

  console.info("Keeping the bot alive…");
  await keepAlive(event, context);

  console.info("Logging out of Discord…");
  await client.destroy();

  console.info("Exiting Lambda…");
};

/**
 * Client ready handler
 * @param client Discord client
 */
const onClientReady = async (client: Client<true>) => {
  console.info(`Logged in to Discord as ${client.user.tag}.`);

  const guild = await client.guilds.fetch("215386000132669440");
  console.info("Guild name:", guild.name);
};

/**
 * Initialize event handlers for the Discord watcher
 * @param client Discord client
 * @param event  Event that started the Discord watcher
 */
const initEventHandlers = (
  client: Client,
  event: ScheduledEvent | TestEvent,
) => {
  client.once(Events.ClientReady, (resolvedClient) => {
    void onClientReady(resolvedClient);
  });

  client.once(Events.Error, (error) => {
    console.warn("Client exited with the following error:");
    console.error(error);
  });

  client.on(Events.MessageCreate, (message) => {
    // Blindly pass all messages to SNS for further processing
    void publishToDiscordOutTopic(message, event);
  });
};
