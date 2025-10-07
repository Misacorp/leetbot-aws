import logger from "@logger";
import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import { APIInteraction } from "discord-api-types/v10";
import {
  isAPIChatInputCommandInteraction,
  isComponentInteraction,
} from "@/src/discord/interactions/typeGuards";

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
        await cw.send(
          new PutMetricDataCommand({
            Namespace: NAMESPACE,
            MetricData: [
              {
                MetricName: "ComponentInteraction",
                Dimensions: [
                  {
                    Name: "CustomIdPrefix",
                    Value: interaction.data.custom_id.split(":")[0],
                  },
                  {
                    Name: "ComponentType",
                    Value: interaction.data.component_type.toString(),
                  },
                ],
                Unit: "Count",
                Value: 1,
              },
            ],
          }),
        );

        return;
      }

      // Unsupported commands
      if (!isAPIChatInputCommandInteraction(interaction)) {
        await cw.send(
          new PutMetricDataCommand({
            Namespace: NAMESPACE,
            MetricData: [
              {
                MetricName: "UnsupportedInteraction",
                Dimensions: [
                  { Name: "InteractionType", Value: `${interaction.type}` },
                ],
                Unit: "Count",
                Value: 1,
              },
            ],
          }),
        );

        return;
      }

      // Slash commands
      const commandName = interaction.data.name;
      const opts = interaction.data.options ?? [];

      // Identify subcommand and option names
      const subcommand =
        opts[0] &&
        "type" in opts[0] &&
        (opts[0].type === 1 || opts[0].type === 2)
          ? opts[0].name
          : undefined;

      const hasSubOptions = (
        opt: any,
      ): opt is { options: { name: string }[] } =>
        "options" in opt && Array.isArray(opt.options);

      const optionNames =
        subcommand && hasSubOptions(opts[0])
          ? opts[0].options.map((o) => o.name)
          : opts.map((o) => o.name);

      // Build metric data array
      const metricData: any[] = [];

      // Subcommand metric
      if (subcommand) {
        metricData.push({
          MetricName: "CommandUsage",
          Dimensions: [
            { Name: "Command", Value: commandName },
            { Name: "Subcommand", Value: subcommand },
          ],
          Unit: "Count",
          Value: 1,
        });
      }

      // Option metrics (include value when bounded)
      for (const optName of optionNames) {
        const option = opts.find((o) => o.name === optName);
        const hasValue = (
          opt: any,
        ): opt is { value: string | number | boolean } => "value" in opt;
        const value =
          option && hasValue(option)
            ? typeof option.value === "string" ||
              typeof option.value === "number"
              ? String(option.value)
              : undefined
            : undefined;

        const dimensions = [
          { Name: "Command", Value: commandName },
          { Name: "Option", Value: optName },
          ...(subcommand ? [{ Name: "Subcommand", Value: subcommand }] : []),
          ...(value ? [{ Name: "Value", Value: value }] : []),
        ];

        metricData.push({
          MetricName: "CommandUsage",
          Dimensions: dimensions,
          Unit: "Count",
          Value: 1,
        });
      }

      await cw.send(
        new PutMetricDataCommand({
          Namespace: NAMESPACE,
          MetricData: metricData,
        }),
      );

      return;
    },
  );

  // Treat each message in the batch independently
  await Promise.allSettled(promises);
};
