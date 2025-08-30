import logger from "@logger";
import type { Context, ScheduledEvent } from "aws-lambda";
import { Client, Events, IntentsBitField, Partials } from "/opt/nodejs/discord";
import keepAlive from "@/src/util/lambda";
import { getSecret } from "@/src/util/secrets";
import type { PartialDiscordMessage, TestEvent } from "@/src/types";
import { onClientReady } from "./onClientReady";
import { onMessageCreate } from "./onMessageCreate";
import { SQSPoller } from "./sqsPoller";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TOKEN_SECRET_ID: string;
      TABLE_NAME: string;
      DISCORD_OUT_TOPIC_ARN: string;
      DISCORD_IN_QUEUE_URL: string;
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
  const sqsPoller = new SQSPoller();

  initEventHandlers({
    client,
    tableName: process.env.TABLE_NAME,
    sqsPoller,
    event,
  });

  // Start the bot lifecycle
  logger.info("Logging in to Discord…");
  await client.login(token);

  logger.info("Keeping the bot alive…");
  await keepAlive(event, context);

  // Stop SQS polling
  logger.info("Stopping SQS polling…");
  sqsPoller.stopPolling();

  // Remove all listeners before quitting
  logger.info("Removing event listeners…");
  client.removeAllListeners();

  logger.info("Logging out of Discord…");
  await client.destroy();

  logger.info("Exiting Lambda…");
};

/**
 * Initialize lifecycle event handlers for the Discord watcher
 */
const initEventHandlers = ({
  // Discord client
  client,
  tableName,
  // SQS poller instance
  sqsPoller,
  // Event that started the Discord watcher Lambda
  event,
}: {
  client: Client;
  tableName: string;
  event: ScheduledEvent | TestEvent;
  sqsPoller: SQSPoller;
}) => {
  client.once(Events.ClientReady, (resolvedClient) => {
    void onClientReady({ client: resolvedClient, tableName, sqsPoller });
  });

  client.once(Events.Error, (error) => {
    logger.warn("Client exited with the following error:");
    logger.error(error);
  });

  client.on(Events.MessageCreate, (message) => {
    void onMessageCreate({
      // Type-casting here because Discord actually returns an object resembling a `PartialDiscordMessage`,
      // but the Discord.js types don't account for this.
      message: message as unknown as PartialDiscordMessage,
      discordOutTopicArn: process.env.DISCORD_OUT_TOPIC_ARN,
      event,
    });
  });
};
