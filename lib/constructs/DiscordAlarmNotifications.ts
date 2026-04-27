import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatchActions from "aws-cdk-lib/aws-cloudwatch-actions";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as ssm from "aws-cdk-lib/aws-ssm";
import {
  createLogGroup,
  getDefaultLambdaConfig,
  getLogLevel,
  getMinify,
} from "@/src/util/infra";
import type { ILambdaLayers } from "@/lib/constructs/Discord/LambdaLayers";

interface Props {
  readonly environment: string;
  readonly layers: ILambdaLayers;
}

/**
 * Sends CloudWatch alarm state changes to a Discord webhook.
 */
export class DiscordAlarmNotifications extends Construct {
  public readonly topic: sns.Topic;
  public readonly webhookUrlParameter: ssm.StringParameter;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.topic = new sns.Topic(this, "AlarmTopic", {
      fifo: false,
    });

    // Using Parameter Store over Secrets Manager for cost reasons 👹
    this.webhookUrlParameter = new ssm.StringParameter(
      this,
      "DiscordWebhookUrl",
      {
        parameterName: "/leetbot/monitoring/discord-webhook-url",
        stringValue: "change-me",
        description: "Discord webhook URL for Leetbot alarm notifications",
      },
    );

    new cdk.CfnOutput(this, "DiscordWebhookUrlParameter", {
      value: this.webhookUrlParameter.parameterName,
      description: "SSM parameter name for the Discord monitoring webhook URL",
    });

    const notifierLambda = new NodejsFunction(this, "AlarmNotifier", {
      ...getDefaultLambdaConfig(),
      entry: "src/monitoring/discordAlarmNotifier.ts",
      handler: "handler",
      logGroup: createLogGroup(
        this,
        "AlarmNotifierLogGroup",
        props.environment,
      ),
      bundling: {
        minify: getMinify(props.environment),
        externalModules: ["@aws-sdk/*", "pino"],
      },
      layers: [props.layers.pinoLayer],
      environment: {
        DEPLOYMENT_ENVIRONMENT: props.environment,
        DISCORD_WEBHOOK_URL_PARAMETER_NAME:
          this.webhookUrlParameter.parameterName,
        LOG_LEVEL: getLogLevel(props.environment),
      },
      description: "Posts CloudWatch alarm changes to a Discord webhook.",
    });

    this.webhookUrlParameter.grantRead(notifierLambda);

    this.topic.addSubscription(new subs.LambdaSubscription(notifierLambda));
  }

  /**
   * Allows any construct to register their alarms to this notification stream
   */
  public registerAlarm(alarm: cloudwatch.Alarm): void {
    const action = new cloudwatchActions.SnsAction(this.topic);

    alarm.addAlarmAction(action);
    alarm.addOkAction(action);
  }
}
