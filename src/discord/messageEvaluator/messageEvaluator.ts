import logger from "@logger";
import type { SNSEvent } from "aws-lambda";
import type { DiscordBotOutPayload } from "@/src/types";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { leetHandler } from "./leetHandler";
import { leebHandler } from "./leebHandler";
import { failedLeetHandler } from "@/src/discord/messageEvaluator/failedLeetHandler";
import { runSequentially } from "@/src/util/orchestration";

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
export const handler = async (event: SNSEvent) => {
  const payloads = event.Records.map(
    (record: SNSEvent["Records"][number]) =>
      JSON.parse(record.Sns.Message) as DiscordBotOutPayload,
  ).sort((a, b) => {
    // Process oldest messages first within each batch.
    // Accepted risk: cross-batch timestamps may be processed out of order.
    // This entire check is mainly to guard against users trying to game the system
    // with multiple game messages in quick succession.
    const createdTimestampDiff =
      a.message.createdTimestamp - b.message.createdTimestamp;
    if (createdTimestampDiff !== 0) {
      return createdTimestampDiff;
    }

    return a.message.id.localeCompare(b.message.id);
  });

  await runSequentially(payloads, async (payload) => {
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
    await Promise.allSettled([
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
};
