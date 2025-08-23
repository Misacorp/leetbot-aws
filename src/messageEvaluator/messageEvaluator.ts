import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import type { DiscordBotOutPayload } from "@/src/types";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { leetHandler } from "./leetHandler";

/**
 * Handles game-related messages like LEET, LEEB, etc.
 * Messages originate from the Discord bot but are passed through AWS services as JSON.
 */
export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    const snsRecord = JSON.parse(record.body) as SNSMessage;
    const payload = JSON.parse(snsRecord.Message) as DiscordBotOutPayload;
    const { message, event } = payload;

    console.debug("Received this Discord message", message);
    console.debug("Received this event", event);

    if (!message.guild) {
      console.warn("Message has no 'guild' property. Exiting…");
      return;
    }

    console.debug("Getting guild information from DynamoDB…");
    const guild = await getGuildById(message.guild.id);
    console.debug("Guild retrieved:", guild);

    if (!guild) {
      console.warn(`No guild with id ${message.guild.id} found. Exiting…`);
      return;
    }

    // Pass the message to each handler that would be interested in processing it.
    // Handlers can be mutually exclusive, or they can have overlapping functionality.
    return Promise.all([
      leetHandler({ message, guild, alwaysAllowLeet: event?.alwaysAllowLeet }),
    ]);
  });

  await Promise.all(promises);
};
