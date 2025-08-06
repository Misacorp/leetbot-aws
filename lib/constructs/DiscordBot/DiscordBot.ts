import path from "path";
import * as cdk from "aws-cdk-lib";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources"; // Add this import
import * as logs from "aws-cdk-lib/aws-logs"; // Add this import at the top
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import type { ILambdaLayers } from "./LambdaLayers";
import { getRemovalPolicy } from "../../../src/leetbot/util/infra";
import { type ITable } from "../Table";

interface Props {
  readonly layers: ILambdaLayers;
  readonly table: ITable;
}

/**
 * Discord bot.
 * Uses the Discord API to log into a server and read all messages posted.
 */
export class DiscordBot extends Construct {
  public readonly discordWatcher: lambda.IFunction;

  /**
   * SNS topic where the Discord bot will send all relevant messages it receives.
   */
  public readonly discordBotOutTopic: sns.ITopic;

  /**
   * SQS queue that writes Discord messages to the database.
   */
  public readonly messageWriterQueue: sqs.IQueue;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Create a place in AWS Secrets Manager to store our bot token
    const secret = new secretsManager.Secret(this, "DiscordBotToken", {
      description: "Discord bot token secret",
      removalPolicy: getRemovalPolicy(),
    });

    // Output the secret ARN after deployment
    new cdk.CfnOutput(this, "DiscordBotTokenArn", {
      value: secret.secretArn,
    });

    // Create an SNS topic where the bot will send all relevant messages
    // it receives for further processing.
    this.discordBotOutTopic = new sns.Topic(this, "DiscordBotOutTopic", {
      fifo: true,
      contentBasedDeduplication: true,
    });

    // Discord bot Lambda function
    this.discordWatcher = new NodejsFunction(this, "DiscordWatcher", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, "../../../src/leetbot/discordWatcher.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(60 * 4 + 15),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "DiscordWatcherLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
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
        TOPIC_ARN: this.discordBotOutTopic.topicArn,
      },
      description:
        "Starts a Discord bot to read all messages. Use the `timeoutOverrideMs` event to override execution time.",
    });

    // Grant Lambda the permissions it needs
    secret.grantRead(this.discordWatcher);
    this.discordBotOutTopic.grantPublish(this.discordWatcher);

    // Export Lambda function's name to cdk-outputs.json.
    // Used with the scripts in this project.
    new cdk.CfnOutput(this, "DiscordWatcherName", {
      value: this.discordWatcher.functionName,
      description: "Discord watcher Lambda function name",
    });

    // Queue that reads from the Discord outgoing SNS topic
    this.messageWriterQueue = new sqs.Queue(this, "MessageWriterQueue", {
      removalPolicy: getRemovalPolicy(),
      contentBasedDeduplication: true,
      fifo: true,
      retentionPeriod: cdk.Duration.days(7),
    });

    this.discordBotOutTopic.addSubscription(
      new subs.SqsSubscription(this.messageWriterQueue),
    );

    // Lambda that writes messages to the database
    const messageWriterLambda = new NodejsFunction(this, "MessageWriter", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, "../../../src/leetbot/saveMessageToDb.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "MessageWriterLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        TOKEN_SECRET_ID: secret.secretName,
        TABLE_NAME: props.table.tableName,
      },
      description: "Writes messages received from Discord to a database",
    });

    props.table.grantReadWriteData(messageWriterLambda);

    // Add SQS event source to trigger Lambda when messages arrive
    messageWriterLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(this.messageWriterQueue, {
        batchSize: 10,
      }),
    );
  }
}
