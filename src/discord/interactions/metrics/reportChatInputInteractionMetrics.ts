import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import {
  parseInteractionStructure,
  formatOptionValueForMetrics,
} from "@/src/discord/interactions/utils/parseInteractionStructure";

interface Args {
  cloudwatchClient: CloudWatchClient;
  namespace: string;
  interaction: APIChatInputApplicationCommandInteraction;
}

/**
 * Handles reporting of slash command interactions.
 */
export const reportChatInputInteractionMetrics = async ({
  cloudwatchClient,
  namespace,
  interaction,
}: Args) => {
  const commandName = interaction.data.name;
  const { subcommand, options } = parseInteractionStructure(interaction);

  // Get invoking user information
  const invokingUser = interaction.member?.user ?? interaction.user;
  const invokingUsername =
    invokingUser?.global_name ?? invokingUser?.username ?? "unknown";

  // Build metric data array
  const metricData: any[] = [];

  // Always send command usage metric with subcommand dimension
  metricData.push({
    MetricName: "CommandUsage",
    Dimensions: [
      { Name: "Command", Value: commandName },
      { Name: "Subcommand", Value: subcommand ?? "" },
      { Name: "Invoker", Value: invokingUsername },
    ],
    Unit: "Count",
    Value: 1,
  });

  // Option metrics (track all options)
  for (const option of options) {
    const value = formatOptionValueForMetrics(option);

    metricData.push({
      MetricName: "OptionUsage",
      Dimensions: [
        { Name: "Command", Value: commandName },
        { Name: "Subcommand", Value: subcommand ?? "" },
        { Name: "Option", Value: option.name },
        { Name: "Value", Value: value },
      ],
      Unit: "Count",
      Value: 1,
    });
  }

  await cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: metricData,
    }),
  );
};
