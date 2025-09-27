import logger from "@logger";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import { updateOriginalResponse, sendErrorResponse } from "./discordWebhook";
import { isAPIChatInputCommandInteraction } from "@/src/discordCommands/typeGuards";
import {
  type APIInteraction,
  type APIChatInputApplicationCommandInteraction,
} from "discord-api-types/v10";
import { getGuildMessages } from "@/src/repository/message/getGuildMessages";
import { MessageType, MessageTypes } from "@/src/types";
import { Message } from "@/src/repository/message/types";
import { getGuildMembersByGuildId } from "@/src/repository/user/getGuildMembersByGuildId";
import { User } from "@/src/repository/user/types";
import {
  parseCommand,
  isRankingCommand,
  isUserInfoCommand,
} from "./commandRouter";
import {
  type RankingCommandData,
  type UserInfoCommandData,
  type CommandWindow,
} from "./registration/commands";

export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(async (record: SQSRecord) => {
    logger.debug({ record }, "Raw SQS record");
    const snsRecord = JSON.parse(record.body) as SNSMessage;
    const interaction = JSON.parse(snsRecord.Message) as APIInteraction;

    logger.debug(
      {
        interactionId: interaction.id,
        guild: interaction.guild_id,
        channel: interaction.channel_id,
        data: interaction.data,
      },
      "Received command",
    );

    if (!isAPIChatInputCommandInteraction(interaction)) {
      throw new Error("Invalid interaction type");
    }

    try {
      // Parse the command using your generic parser + type-safe routing
      const commandData = parseCommand(interaction);

      if (!commandData) {
        throw new Error("Failed to parse command");
      }

      logger.info({ command: commandData.command }, "Parsed command");

      // Type-safe routing
      if (isRankingCommand(commandData)) {
        return handleRankingCommand(interaction, commandData.data);
      } else if (isUserInfoCommand(commandData)) {
        return handleUserInfoCommand(interaction, commandData.data);
      }

      throw new Error("Invalid command");
    } catch (error) {
      logger.error(
        {
          error: error,
          interactionId: interaction.id,
        },
        "Failed to process command",
      );

      return sendErrorResponse(
        interaction,
        "❌ Sorry, there was an error processing your command. Please try again later.",
      );
    }
  });

  await Promise.all(promises);
};

async function handleRankingCommand(
  interaction: APIChatInputApplicationCommandInteraction,
  data: RankingCommandData,
): Promise<{ statusCode: number; body: string }> {
  logger.info(
    {
      subcommand: data.subcommand,
      window: data.window,
    },
    "Processing ranking command",
  );

  // Your existing ranking logic here...
  const messageTypeMap = {
    leet: MessageTypes.LEET,
    leeb: MessageTypes.LEEB,
    failed_leet: MessageTypes.FAILED_LEET,
  } as const;

  const messageType = messageTypeMap[data.subcommand];
  const { startDate, endDate } = getDateRange(data.window);

  // Implementation continues...
  const responseContent = `✅ Ranking command for ${data.subcommand} with window ${data.window || "all_time"}`;

  const result = await updateOriginalResponse(interaction, {
    content: responseContent,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send Discord response");
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, discordResponse: result.status }),
  };
}

async function handleUserInfoCommand(
  interaction: APIChatInputApplicationCommandInteraction,
  data: UserInfoCommandData,
): Promise<{ statusCode: number; body: string }> {
  logger.info(
    {
      userId: data.userId,
      window: data.window,
    },
    "Processing user info command",
  );

  const responseContent = `✅ User info command for user ${data.userId} with window ${data.window || "all_time"}`;

  const result = await updateOriginalResponse(interaction, {
    content: responseContent,
  });

  if (!result.success) {
    throw new Error(result.error || "Failed to send Discord response");
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, discordResponse: result.status }),
  };
}

function getDateRange(window?: CommandWindow) {
  const endDate = new Date();
  let startDate: Date;

  switch (window) {
    case "this_week":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "this_month":
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "this_year":
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "all_time":
    default:
      startDate = new Date(2025, 8, 22, 0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}
