import path from "path";
import * as cdk from "aws-cdk-lib";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import type { ILambdaLayers } from "./LambdaLayers";

interface Props {
  readonly layers: ILambdaLayers;
}

/**
 * Discord bot.
 * Uses the Discord API to log into a server and read all messages posted.
 */
export class DiscordBot extends Construct {
  public readonly discordWatcher: lambda.IFunction;

  /**
   * SQS queue where the Discord bot will send all relevant messages it receives.
   */
  public readonly discordBotOutQueue: sqs.IQueue;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Create a place in AWS Secrets Manager to store our bot token
    const secret = new secretsManager.Secret(this, "DiscordBotToken", {
      description: "Discord bot token secret",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: Change when moving away from the AWS sandbox account
    });

    // Output the secret ARN after deployment
    new cdk.CfnOutput(this, "DiscordBotTokenArn", {
      value: secret.secretArn,
    });

    // Create an SQS queue where the bot will send all relevant messages
    // it receives for further processing.
    this.discordBotOutQueue = new sqs.Queue(this, "DiscordBotOutQueue", {
      fifo: true,
      retentionPeriod: cdk.Duration.days(7),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      contentBasedDeduplication: true,
    });

    // Discord bot Lambda function
    this.discordWatcher = new NodejsFunction(this, "DiscordWatcher", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, "../../src/leetbot/discordWatcher.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(60 * 4 + 15),
      memorySize: 256,
      logRetention: RetentionDays.THREE_DAYS,
      bundling: {
        minify: false,
        externalModules: [
          "@aws-sdk/*",
          "discord.js",
          "date-fns",
          "date-fns-tz",
        ],
      },
      layers: [props.layers.discordLayer, props.layers.dateFnsLayer],
      environment: {
        TOKEN_SECRET_ID: secret.secretName,
        QUEUE_URL: this.discordBotOutQueue.queueUrl,
      },
      description:
        "Starts a Discord bot to read all messages. Use the `timeoutOverrideMs` event to override execution time.",
    });

    // Grant Lambda the permissions it needs
    secret.grantRead(this.discordWatcher);
    this.discordBotOutQueue.grantSendMessages(this.discordWatcher);

    // Export Lambda function's name to cdk-outputs.json
    new cdk.CfnOutput(this, "DiscordWatcherName", {
      value: this.discordWatcher.functionName,
      description: "Discord watcher Lambda function name",
    });
  }
}
