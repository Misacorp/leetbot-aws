import type { SQSEvent, SQSRecord } from "aws-lambda";
import type { DiscordMessage } from "../types";
import { createMessage } from "../repository/message/createMessage";
import { type Message, MessageTypes } from "../repository/message/types";

export const handler = async (event: SQSEvent): Promise<void[]> => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    const discordMessage = JSON.parse(record.body) as DiscordMessage;
    console.debug(
      "Writing the following message to the database",
      discordMessage,
    );

    if (!discordMessage.guild?.id) {
      return;
    }

    const message: Message = {
      messageType: MessageTypes.LEET,
      createdAt: new Date(discordMessage.createdTimestamp).toISOString(),
      userId: discordMessage.author.id,
      guildId: discordMessage.guild.id,
      id: discordMessage.id,
    };

    await createMessage(message);
  });

  return Promise.all(promises);
};
