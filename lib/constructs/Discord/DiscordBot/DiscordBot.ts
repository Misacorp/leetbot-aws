import * as cdk from "aws-cdk-lib";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import {
  createLogGroup,
  getDefaultLambdaConfig,
  getLogLevel,
  getMinify,
  getRemovalPolicy,
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
 * Discord bot.
 * Uses the Discord API to log into a server and read all messages posted.
 */
export class DiscordBot extends Construct {
  public readonly discordWatcher: NodejsFunction;
  public readonly messageEvaluationSubscription: SnsLambdaSubscriptionWithFailureHandling;

  /**
   * SNS topic where the Discord bot will send all relevant messages it receives.
   */
  public readonly discordBotOutTopic: sns.ITopic;

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

    // Create an SNS topic where the bot will send all relevant messages
    // it receives for further processing.
    this.discordBotOutTopic = new sns.Topic(this, "DiscordBotOutTopic", {
      fifo: false,
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
      ...getDefaultLambdaConfig(),
      entry: "src/discord/discordWatcher/discordWatcher.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(60 * 4 + 15),
      memorySize: 256,
      logGroup: createLogGroup(
        this,
        "DiscordWatcherLogGroup",
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
        TOKEN_PARAMETER_NAME: props.parameters.botToken.parameterName,
        TABLE_NAME: props.table.tableName,
        DISCORD_OUT_TOPIC_ARN: this.discordBotOutTopic.topicArn,
        DISCORD_IN_QUEUE_URL: this.discordInQueue.queueUrl,
        LOG_LEVEL: getLogLevel(props.environment),
      },
      reservedConcurrentExecutions: 1,
      description:
        "Starts a Discord bot to read all messages. Use the `timeoutOverrideMs` event to override execution time.",
    });

    // Grant Lambda the permissions it needs
    props.parameters.botToken.grantRead(this.discordWatcher);
    props.table.grantWriteData(this.discordWatcher);
    this.discordBotOutTopic.grantPublish(this.discordWatcher);
    this.discordInQueue.grantConsumeMessages(this.discordWatcher);

    // Export Lambda function's name to cdk-outputs.json.
    // Used with the scripts in this project.
    new cdk.CfnOutput(this, "DiscordWatcherName", {
      value: this.discordWatcher.functionName,
      description: "Discord watcher Lambda function name",
    });

    // Lambda that writes messages to the database
    const messageEvaluator = new NodejsFunction(this, "MessageEvaluator", {
      ...getDefaultLambdaConfig(),
      entry: "src/discord/messageEvaluator/messageEvaluator.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(15),
      logGroup: createLogGroup(
        this,
        "MessageEvaluatorLogGroup",
        props.environment,
      ),
      layers: [
        props.layers.discordLayer,
        props.layers.dateFnsLayer,
        props.layers.pinoLayer,
      ],
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
      environment: {
        TABLE_NAME: props.table.tableName,
        MESSAGE_EVALUATOR_OUT_TOPIC_ARN:
          this.messageEvaluationOutTopic.topicArn,
        LOG_LEVEL: getLogLevel(props.environment),
      },
      description:
        "Determines which Discord messages are interesting for the 'leet game', and processes them further.",
    });

    props.table.grantReadWriteData(messageEvaluator);
    this.messageEvaluationOutTopic.grantPublish(messageEvaluator);

    this.messageEvaluationSubscription =
      new SnsLambdaSubscriptionWithFailureHandling(
        this,
        "MessageEvaluationSubscription",
        {
          environment: props.environment,
          topic: this.discordBotOutTopic,
          target: messageEvaluator,
          subscriptionDlqAlarmDescription:
            "Message evaluation subscription DLQ has undelivered SNS messages.",
          lambdaFailureAlarmDescription:
            "Message evaluation Lambda has failed async invocations.",
        },
      );
  }
}
