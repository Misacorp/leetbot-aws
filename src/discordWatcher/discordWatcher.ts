import type { Context, ScheduledEvent } from "aws-lambda";
import { Client, Events, IntentsBitField, Partials } from "/opt/nodejs/discord";
import keepAlive from "../util/lambda";
import { getSecret } from "../util/secrets";
import type { PartialDiscordMessage, TestEvent } from "../types";
import { onClientReady } from "./onClientReady";
import { onMessageCreate } from "./onMessageCreate";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN_SECRET_ID: string;
      TOPIC_ARN: string;
    }
  }
}

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
  const token = await getSecret(process.env.TOKEN_SECRET_ID);
  const client = new Client({
    intents: new IntentsBitField()
      .add(IntentsBitField.Flags.Guilds)
      .add(IntentsBitField.Flags.GuildMessages)
      .add(IntentsBitField.Flags.MessageContent)
      .add(IntentsBitField.Flags.GuildMembers),
    partials: [
      Partials.Message,
      Partials.User,
      Partials.Channel,
      Partials.GuildMember,
    ],
    closeTimeout: 300,
  });

  initEventHandlers(client, event);

  // Start the bot lifecycle
  console.info("Logging in to Discord…");
  await client.login(token);

  console.info("Keeping the bot alive…");
  await keepAlive(event, context);

  // Remove all listeners before quitting
  console.info("Removing event listeners…");
  client.removeAllListeners();

  console.info("Logging out of Discord…");
  await client.destroy();

  console.info("Exiting Lambda…");
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
    // Type-casting here because Discord actually returns an object resembling a `PartialDiscordMessage`,
    // but the Discord.js types don't account for this.
    void onMessageCreate(message as unknown as PartialDiscordMessage, event);
  });
};
