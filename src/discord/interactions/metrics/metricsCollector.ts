import logger from "@logger";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import {
  APIInteraction,
  ApplicationCommandOptionType,
} from "discord-api-types/v10";
import {
  isAPIChatInputCommandInteraction,
  isComponentInteraction,
} from "@/src/discord/interactions/typeGuards";
import { reportComponentInteractionMetrics } from "@/src/discord/interactions/metrics/reportComponentInteractionMetrics";
import { reportUnsupportedInteractionMetrics } from "@/src/discord/interactions/metrics/reportUnsupportedInteractionMetrics";
import { reportChatInputInteractionMetrics } from "@/src/discord/interactions/metrics/reportChatInputInteractionMetrics";

const NAMESPACE = "DiscordCommands";
const cw = new CloudWatchClient({});

/**
 * Collects metrics of command usage and sends them to Cloudwatch
 * @param event SQS event containing an SNS event containing a Discord interaction
 */
export const handler = async (event: SQSEvent) => {
  const promises = event.Records.map(
    async (record: SQSRecord): Promise<void> => {
      logger.debug({ record }, "Raw SQS record");
      const snsRecord = JSON.parse(record.body) as SNSMessage;
      const interaction = JSON.parse(snsRecord.Message) as APIInteraction;

      // Component interactions
      if (isComponentInteraction(interaction)) {
        await reportComponentInteractionMetrics({
          cloudwatchClient: cw,
          namespace: NAMESPACE,
          interaction,
        });
        return;
      }

      // Slash commands
      if (isAPIChatInputCommandInteraction(interaction)) {
        await reportChatInputInteractionMetrics({
          cloudwatchClient: cw,
          namespace: NAMESPACE,
          interaction,
        });
      }

      // Unsupported interactions
      await reportUnsupportedInteractionMetrics({
        cloudwatchClient: cw,
        namespace: NAMESPACE,
        interaction,
      });
    },
  );

  // Treat each message in the batch independently
  await Promise.allSettled(promises);
};
