import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import type { DiscordMessage } from "../types";
import { createMessage } from "../repository/message/createMessage";
import { type Message, MessageTypes } from "../repository/message/types";

export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    const snsRecord = JSON.parse(record.body) as SNSMessage;
    const discordMessage = JSON.parse(snsRecord.Message) as DiscordMessage;

    console.debug("Received this Discord message", discordMessage);

    if (!discordMessage.guild) {
      console.warn("Message has no 'guild' property. Exiting…");
      return;
    }

    const message: Message = {
      messageType: MessageTypes.TEST, // TODO: Change this
      createdAt: new Date(discordMessage.createdTimestamp).toISOString(),
      userId: discordMessage.author.id,
      guildId: discordMessage.guild.id,
      id: discordMessage.id,
    };

    return createMessage(message);
  });

  await Promise.all(promises);
};
