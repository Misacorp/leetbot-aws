import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";
import type { APIMessageComponentInteraction } from "discord-api-types/v10";

interface Args {
  cloudwatchClient: CloudWatchClient;
  namespace: string;
  interaction: APIMessageComponentInteraction;
}

/**
 * Handles reporting of component interaction metrics to CloudWatch.
 */
export const reportComponentInteractionMetrics = async ({
  cloudwatchClient,
  namespace,
  interaction,
}: Args) => {
  return cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: namespace,
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
};
