import logger from "@logger";
import type { ScheduledEvent } from "aws-lambda";
import { type GuildMember } from "/opt/nodejs/discord";
import type { PartialDiscordMessage, TestEvent } from "@/src/types";
import { publishDiscordMessage } from "@/src/discord/discordWatcher/publishDiscordMessage";

/**
 * Handles message creation events in Discord
 */
export const onMessageCreate = async ({
  message,
  discordOutTopicArn,
  event,
}: {
  // Newly created message
  message: PartialDiscordMessage;
  // Fan-out topic arn
  discordOutTopicArn: string;
  // Event that started the Discord watcher
  event: ScheduledEvent | TestEvent;
}) => {
  if (message.partial) {
    try {
      await message.fetch();
    } catch {
      logger.warn(`Could not fetch message with id ${message.id}`);
    }
  }

  // Fetch author user object if partial or uncached
  let authorUser = message.author;
  if (!authorUser || authorUser.partial) {
    try {
      authorUser = await message.client.users.fetch(message.authorId);
    } catch {
      logger.warn(`Failed to fetch user with authorId ${message.authorId}`);
    }
  }

  // Fetch guild-specific member data
  let guildMember: GuildMember | undefined;
  if (message.guild) {
    try {
      guildMember = await message.guild.members.fetch(authorUser.id);
    } catch {
      logger.warn(`Failed to fetch guild member with id ${authorUser.id}`);
    }
  }

  // Minimal serializable JSON payload
  const payload: Parameters<typeof publishDiscordMessage>[0] = {
    message: {
      id: message.id,
      createdTimestamp: message.createdTimestamp,
      channelId: message.channelId,
      content: message.content,
      author: {
        id: authorUser.id,
        username: authorUser.username,
        discriminator: authorUser.discriminator,
        avatar: authorUser.avatar,
        avatarUrl: authorUser.avatarURL({
          forceStatic: true,
          extension: "png",
        }),
      },
      member: guildMember && {
        displayName: guildMember.displayName,
        avatarUrl: guildMember.displayAvatarURL({ forceStatic: true }),
        bannerUrl: guildMember.bannerURL({
          forceStatic: true,
        }),
      },
      guild: message.guild,
    },

    topicArn: discordOutTopicArn,
    event,
  };

  // Blindly pass all messages to SNS for further processing
  const success = await publishDiscordMessage(payload);

  if (!success) {
    // React with a warning emoji if SNS publish failed
    await message.react("⚠️");
  }
};
