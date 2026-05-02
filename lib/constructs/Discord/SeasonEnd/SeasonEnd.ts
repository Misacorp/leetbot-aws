import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import {
  createLogGroup,
  getDefaultLambdaConfig,
  getLogLevel,
  getMinify,
} from "@/src/util/infra";
import { SnsLambdaSubscriptionWithFailureHandling } from "@/lib/constructs/SnsLambdaSubscriptionWithFailureHandling";
import { type ITable } from "@/lib/constructs/Table";
import type { ILambdaLayers } from "../LambdaLayers";
import type { IDiscordParameters } from "../DiscordParameters";

interface Props {
  readonly layers: ILambdaLayers;
  readonly table: ITable;
  readonly environment: string;
  readonly parameters: IDiscordParameters;
}

/**
 * Season-end Discord effects that do not use the gateway bot runtime.
 */
export class SeasonEnd extends Construct {
  public readonly seasonEndTopic: sns.ITopic;
  public readonly seasonWinnerRoleUpdater: lambda.Function;
  public readonly seasonWinnerRoleUpdateSubscription: SnsLambdaSubscriptionWithFailureHandling;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.seasonEndTopic = new sns.Topic(this, "SeasonEndTopic", {
      fifo: false,
    });

    this.seasonWinnerRoleUpdater = new NodejsFunction(
      this,
      "SeasonWinnerRoleUpdater",
      {
        ...getDefaultLambdaConfig(),
        entry:
          "src/discord/seasonWinnerRoleUpdater/seasonWinnerRoleUpdateHandler.ts",
        handler: "handler",
        timeout: cdk.Duration.seconds(60),
        logGroup: createLogGroup(
          this,
          "SeasonWinnerRoleUpdaterLogGroup",
          props.environment,
        ),
        bundling: {
          minify: getMinify(props.environment),
          externalModules: [
            "@aws-sdk/*",
            "discord.js",
            "date-fns",
            "date-fns-tz",
            "pino",
          ],
        },
        layers: [
          props.layers.discordLayer,
          props.layers.dateFnsLayer,
          props.layers.pinoLayer,
        ],
        environment: {
          TABLE_NAME: props.table.tableName,
          TOKEN_PARAMETER_NAME: props.parameters.botToken.parameterName,
          LOG_LEVEL: getLogLevel(props.environment),
        },
        reservedConcurrentExecutions: 1,
        description:
          "Synchronizes Leet Lord role holders to the resolved season winners.",
      },
    );

    props.table.grantReadData(this.seasonWinnerRoleUpdater);
    props.parameters.botToken.grantRead(this.seasonWinnerRoleUpdater);

    new cdk.CfnOutput(this, "SeasonWinnerRoleUpdaterName", {
      value: this.seasonWinnerRoleUpdater.functionName,
      description: "Season winner role updater Lambda function name",
    });

    this.seasonWinnerRoleUpdateSubscription =
      new SnsLambdaSubscriptionWithFailureHandling(
        this,
        "SeasonWinnerRoleUpdateSubscription",
        {
          environment: props.environment,
          topic: this.seasonEndTopic,
          target: this.seasonWinnerRoleUpdater,
          subscriptionDlqAlarmDescription:
            "Season winner role update subscription DLQ has undelivered SNS messages.",
          lambdaFailureAlarmDescription:
            "Season winner role update Lambda has failed async invocations.",
        },
      );
  }
}
