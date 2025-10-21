import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { APIInteraction } from "discord-api-types/v10";

interface Args {
  cloudwatchClient: CloudWatchClient;
  namespace: string;
  interaction: APIInteraction;
}

/**
 * Handles reporting of interactions that are currently not supported.
 */
export const reportUnsupportedInteractionMetrics = async ({
  cloudwatchClient,
  namespace,
  interaction,
}: Args) => {
  return cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: namespace,
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
};
