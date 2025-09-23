import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

import { ILambdaLayers } from "@/lib/constructs/Discord/LambdaLayers";
import { getRemovalPolicy } from "@/src/util/infra";
import { IDiscordParameters } from "@/lib/constructs/Discord/DiscordParameters";
import {
  IInteractionsApi,
  InteractionsApi,
} from "@/lib/constructs/Discord/DiscordCommandHandler/InteractionsApi";

interface Props {
  readonly layers: ILambdaLayers;
  readonly environment: string;
  readonly parameters: IDiscordParameters;
}

/**
 * Infrastructure for Discord slash commands.
 * The terms "slash command" and "interaction" are used interchangeably here.
 */
export class DiscordCommandHandler extends Construct {
  public readonly ingressFunction: NodejsFunction;
  public readonly slashCommandWorker: NodejsFunction;
  // Slash commands received from Discord are fanned out to this topic
  public readonly commandProcessingTopic: sns.Topic;
  // Queues Discord slash commands for further processing
  public readonly commandProcessingQueue: sqs.Queue;
  private readonly interactionsApi: IInteractionsApi;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    this.commandProcessingTopic = new sns.Topic(
      this,
      "CommandProcessingTopic",
      {
        fifo: false,
      },
    );

    this.commandProcessingQueue = new sqs.Queue(
      this,
      "CommandProcessingQueue",
      {
        removalPolicy: getRemovalPolicy(props.environment),
        fifo: false,
        retentionPeriod: cdk.Duration.minutes(5),
      },
    );

    // The ingress function verifies Discord request integrity and passes commands forward
    this.ingressFunction = new NodejsFunction(this, "InteractionsIngress", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/discordCommands/ingress.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(5), // Needs to respond to Discord within 3 seconds
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "InteractionsIngressLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*"],
      },
      environment: {
        PUBLIC_KEY_PARAM_NAME: props.parameters.publicKey.parameterName,
        COMMAND_PROCESSING_TOPIC_ARN: this.commandProcessingTopic.topicArn,
      },
      description:
        "Discord Interactions ingress: verifies signatures, handles PING, enqueues command events.",
    });

    // Ingress permissions
    this.commandProcessingTopic.grantPublish(this.ingressFunction);
    props.parameters.publicKey.grantRead(this.ingressFunction);

    // Create API
    this.interactionsApi = new InteractionsApi(this, "InteractionsApi");

    // Add integration
    this.interactionsApi.api.addRoutes({
      path: "/interactions",
      methods: [apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        "InteractionsIntegration",
        this.ingressFunction,
      ),
    });

    // Worker that handles all slash commands
    this.slashCommandWorker = new NodejsFunction(this, "SlashCommandWorker", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/discordCommands/slashCommandWorker.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "SlashCommandWorkerLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*"],
      },
      environment: {},
      description: "Handles all slash commands.",
    });

    // Ingress (Lambda-handled publish) - SNS - SQS - Worker
    this.commandProcessingTopic.addSubscription(
      new subs.SqsSubscription(this.commandProcessingQueue),
    );
    this.slashCommandWorker.addEventSource(
      new lambdaEventSources.SqsEventSource(this.commandProcessingQueue, {
        batchSize: 10,
      }),
    );
  }
}
