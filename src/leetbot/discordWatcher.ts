import type { Context, ScheduledEvent } from "aws-lambda";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { Client, Events, IntentsBitField } from "/opt/nodejs/discord";
import keepAlive from "./util/keepAlive";
import { getSecret } from "./util/secrets";
import { getSqsClient } from "./util/sqs";

export const handler = async (event: ScheduledEvent, context: Context) => {
  // SQS setup
  const sqsClient = getSqsClient({ region: process.env.AWS_REGION });
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
    if (message.content.toLowerCase().includes("leet")) {
      message.react("👀");
      console.info(
        `Reacted to leet from user ${message.author.username} / ${
          message.author.globalName
        } (${message.author.id}). Time remaining: ${Math.round(
          context.getRemainingTimeInMillis() / 1000,
        )}s.`,
      );

      try {
        await sqsClient.send(
          new SendMessageCommand({
            MessageBody: JSON.stringify(message),
            QueueUrl: queueUrl,
            MessageDeduplicationId: message.id,
            MessageGroupId: message.author.id,
          }),
        );
      } catch (err) {
        console.error("Unable to send SQS message due to an error", err);
      }
    }
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
