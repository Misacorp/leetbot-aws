import * as cdk from "aws-cdk-lib";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources"; // Add this import
import * as logs from "aws-cdk-lib/aws-logs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { getRemovalPolicy } from "@/src/util/infra";
import { type ITable } from "@/lib/constructs/Table";
import type { ILambdaLayers } from "../LambdaLayers";

interface Props {
  readonly layers: ILambdaLayers;
  readonly table: ITable;
  readonly environment: string;
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
  public readonly messageEvaluationQueue: sqs.IQueue;

  /**
   * SNS topic where the message evaluator will send information about processed messages.
   */
  public readonly messageEvaluationOutTopic: sns.ITopic;

  /**
   * SQS queue that the Discord bot listens to for reaction commands etc.
   */
  public readonly discordInQueue: sqs.IQueue;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Create a place in AWS Secrets Manager to store our bot token
    const secret = new secretsManager.Secret(this, "DiscordBotToken", {
      description: "Discord bot token secret",
      removalPolicy: getRemovalPolicy(props.environment),
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

    // Message evaluator output topic
    this.messageEvaluationOutTopic = new sns.Topic(
      this,
      "MessageEvaluationOutTopic",
      {
        fifo: false,
      },
    );

    this.discordInQueue = new sqs.Queue(this, "DiscordInQueue", {
      removalPolicy: getRemovalPolicy(props.environment),
      fifo: false,
      retentionPeriod: cdk.Duration.days(1),
    });

    this.messageEvaluationOutTopic.addSubscription(
      new subs.SqsSubscription(this.discordInQueue),
    );

    // Discord bot Lambda function
    this.discordWatcher = new NodejsFunction(this, "DiscordWatcher", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/discordWatcher/discordWatcher.ts",
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
        TABLE_NAME: props.table.tableName,
        DISCORD_OUT_TOPIC_ARN: this.discordBotOutTopic.topicArn,
        DISCORD_IN_QUEUE_URL: this.discordInQueue.queueUrl,
      },
      reservedConcurrentExecutions: 1,
      description:
        "Starts a Discord bot to read all messages. Use the `timeoutOverrideMs` event to override execution time.",
    });

    // Grant Lambda the permissions it needs
    secret.grantRead(this.discordWatcher);
    props.table.grantWriteData(this.discordWatcher);
    this.discordBotOutTopic.grantPublish(this.discordWatcher);
    this.discordInQueue.grantConsumeMessages(this.discordWatcher);

    // Export Lambda function's name to cdk-outputs.json.
    // Used with the scripts in this project.
    new cdk.CfnOutput(this, "DiscordWatcherName", {
      value: this.discordWatcher.functionName,
      description: "Discord watcher Lambda function name",
    });

    // Queue that reads from the Discord outgoing SNS topic
    this.messageEvaluationQueue = new sqs.Queue(
      this,
      "MessageEvaluationQueue",
      {
        removalPolicy: getRemovalPolicy(props.environment),
        contentBasedDeduplication: true,
        fifo: true,
        retentionPeriod: cdk.Duration.days(7),
      },
    );

    this.discordBotOutTopic.addSubscription(
      new subs.SqsSubscription(this.messageEvaluationQueue),
    );

    // Lambda that writes messages to the database
    const messageEvaluator = new NodejsFunction(this, "MessageEvaluator", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/messageEvaluator/messageEvaluator.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "MessageEvaluatorLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      layers: [props.layers.discordLayer, props.layers.dateFnsLayer],
      bundling: {
        minify: false,
        externalModules: [
          "@aws-sdk/*",
          "discord.js",
          "date-fns",
          "date-fns-tz",
        ],
      },
      environment: {
        TABLE_NAME: props.table.tableName,
        MESSAGE_EVALUATOR_OUT_TOPIC_ARN:
          this.messageEvaluationOutTopic.topicArn,
      },
      description:
        "Determines which Discord messages are interesting for the 'leet game', and processes them further.",
    });

    props.table.grantReadWriteData(messageEvaluator);
    this.messageEvaluationOutTopic.grantPublish(messageEvaluator);

    // Add SQS event source to trigger Lambda when messages arrive
    messageEvaluator.addEventSource(
      new lambdaEventSources.SqsEventSource(this.messageEvaluationQueue, {
        batchSize: 10,
      }),
    );
  }
}
