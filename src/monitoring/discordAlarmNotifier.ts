import logger from "@logger";
import type { SNSEvent } from "aws-lambda";
import type { APIEmbed } from "discord-api-types/v10";
import { getValidatedParameter } from "@/src/util/ssm";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DEPLOYMENT_ENVIRONMENT: string;
      DISCORD_WEBHOOK_URL_PARAMETER_NAME: string;
    }
  }
}

interface CloudWatchAlarmNotification {
  AlarmArn: string;
  AlarmDescription?: string;
  AlarmName: string;
  NewStateReason: string;
  NewStateValue: "ALARM" | "OK" | "INSUFFICIENT_DATA" | string;
  OldStateValue: string;
  StateChangeTime: string;
}

/**
 * Reads alarm state changes from an SNS event and posts messages to Discord about them
 * @param event
 */
export const handler = async (event: SNSEvent) => {
  const webhookUrl = await getValidatedParameter(
    process.env.DISCORD_WEBHOOK_URL_PARAMETER_NAME,
    false,
  );

  await Promise.all(
    event.Records.map(async (record: SNSEvent["Records"][number]) => {
      const notification = JSON.parse(
        record.Sns.Message,
      ) as CloudWatchAlarmNotification;

      const alarmUrl = createAlarmUrl({
        alarmArn: notification.AlarmArn,
        alarmName: notification.AlarmName,
      });

      const embed: APIEmbed = {
        title: `${notification.NewStateValue} · ${process.env.DEPLOYMENT_ENVIRONMENT}`,
        description: `**${notification.AlarmName}**\n[Open in CloudWatch](${alarmUrl})`,
        color: getEmbedColor(notification.NewStateValue),
        timestamp: notification.StateChangeTime,
        fields: [
          ...(notification.AlarmDescription
            ? [
                {
                  name: "Description",
                  value: truncate(notification.AlarmDescription, 1024),
                },
              ]
            : []),
          {
            name: "Reason",
            value: truncate(notification.NewStateReason, 1024),
          },
        ],
      };

      logger.info(
        {
          alarmName: notification.AlarmName,
          state: notification.NewStateValue,
        },
        "Posting CloudWatch alarm notification to Discord",
      );

      await postToDiscord({
        webhookUrl,
        embed,
      });
    }),
  );
};

/**
 * Posts an embedded message to Discord using the provided webhook URL
 */
const postToDiscord = async ({
  webhookUrl,
  embed,
}: {
  webhookUrl: string;
  embed: APIEmbed;
}) => {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [embed],
      allowed_mentions: { parse: [] },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(
      {
        status: response.status,
        error: errorText,
      },
      "Discord webhook POST failed",
    );
    throw new Error(
      `Discord webhook POST failed: ${response.status} ${response.statusText}`,
    );
  }
};

const createAlarmUrl = ({
  alarmArn,
  alarmName,
}: {
  alarmArn: string;
  alarmName: string;
}) => {
  const region = alarmArn.split(":")[3];
  return `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:alarm/${encodeURIComponent(alarmName)}`;
};

const getEmbedColor = (state: CloudWatchAlarmNotification["NewStateValue"]) => {
  if (state === "ALARM") {
    return 15158332;
  }

  if (state === "OK") {
    return 3066993;
  }

  return 10181046;
};

const truncate = (input: string, maxLength: number) => {
  if (input.length <= maxLength) {
    return input;
  }

  return `${input.slice(0, maxLength - 1)}…`;
};
