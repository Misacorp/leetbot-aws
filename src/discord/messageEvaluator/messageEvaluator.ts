import logger from "@logger";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import type { DiscordBotOutPayload } from "@/src/types";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { leetHandler } from "./leetHandler";
import { leebHandler } from "./leebHandler";
import { failedLeetHandler } from "@/src/discord/messageEvaluator/failedLeetHandler";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TABLE_NAME: string;
      MESSAGE_EVALUATOR_OUT_TOPIC_ARN: string;
    }
  }
}

const tableName = process.env.TABLE_NAME;
const topicArn = process.env.MESSAGE_EVALUATOR_OUT_TOPIC_ARN;

/**
 * Handles game-related messages like LEET, LEEB, etc.
 * Messages originate from the Discord bot but are passed through AWS services as JSON.
 */
export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    const snsRecord = JSON.parse(record.body) as SNSMessage;
    const payload = JSON.parse(snsRecord.Message) as DiscordBotOutPayload;
    const { message, event } = payload;

    logger.debug({ message }, "Received this Discord message");
    logger.debug({ event }, "Received this event");

    if (!message.guild) {
      logger.warn("Message has no 'guild' property. Exiting…");
      return;
    }

    logger.debug("Getting guild information from DynamoDB…");
    const guild = await getGuildById({
      id: message.guild.id,
      tableName: process.env.TABLE_NAME,
    });
    logger.debug({ guild }, "Guild retrieved:");

    if (!guild) {
      logger.warn(`No guild with id ${message.guild.id} found. Exiting…`);
      return;
    }

    // Pass the message to each handler that would be interested in processing it.
    // Handlers can be mutually exclusive, or they can have overlapping functionality.
    return Promise.all([
      leetHandler({
        message,
        guild,
        tableName,
        topicArn,
        alwaysAllowLeet: event?.alwaysAllowLeet,
        skipUniquenessCheck: event?.skipUniquenessCheck,
      }),
      leebHandler({
        message,
        guild,
        tableName,
        topicArn,
        alwaysAllowLeeb: event?.alwaysAllowLeeb,
        skipUniquenessCheck: event?.skipUniquenessCheck,
      }),
      failedLeetHandler({
        message,
        guild,
        tableName,
        topicArn,
        alwaysAllowFailedLeet: event?.alwaysAllowFailedLeet,
        skipUniquenessCheck: event?.skipUniquenessCheck,
      }),
    ]);
  });

  // Treat each message in the batch independently
  await Promise.allSettled(promises);
};
