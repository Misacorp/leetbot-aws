import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { ISecret } from "aws-cdk-lib/aws-secretsmanager";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";

import { ILambdaLayers } from "@/lib/constructs/Discord/LambdaLayers";
import {
  createLogGroup,
  getDefaultLambdaConfig,
  getLogLevel,
  getRemovalPolicy,
} from "@/src/util/infra";
import { IDiscordParameters } from "@/lib/constructs/Discord/DiscordParameters";
import {
  IInteractionsApi,
  InteractionsApi,
} from "@/lib/constructs/Discord/DiscordCommandHandler/InteractionsApi";
import type { ITable } from "@/lib/constructs/Table";
import type { ICacheTable } from "@/lib/constructs/CacheTable";

interface Props {
  readonly layers: ILambdaLayers;
  readonly environment: string;
  readonly parameters: IDiscordParameters;
  readonly table: ITable;
  readonly cacheTable: ICacheTable;
  readonly botTokenSecret: ISecret;
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
      ...getDefaultLambdaConfig(),
      entry: "src/discord/interactions/ingress.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(5), // Needs to respond to Discord within 3 seconds
      logGroup: createLogGroup(
        this,
        "InteractionsIngressLogGroup",
        props.environment,
      ),
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*", "pino", "tweetnacl"],
      },
      layers: [props.layers.pinoLayer, props.layers.tweetnaclLayer],
      environment: {
        PUBLIC_KEY_PARAM_NAME: props.parameters.publicKey.parameterName,
        COMMAND_PROCESSING_TOPIC_ARN: this.commandProcessingTopic.topicArn,
        LOG_LEVEL: getLogLevel(props.environment),
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
      ...getDefaultLambdaConfig(),
      entry: "src/discord/interactions/slashCommandWorker.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logGroup: createLogGroup(
        this,
        "SlashCommandWorkerLogGroup",
        props.environment,
      ),
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*", "date-fns", "date-fns-tz", "pino"],
      },
      layers: [props.layers.dateFnsLayer, props.layers.pinoLayer],
      environment: {
        TABLE_NAME: props.table.tableName,
        CACHE_TABLE_NAME: props.cacheTable.tableName,
        APPLICATION_ID_PARAM_NAME: props.parameters.applicationId.parameterName,
        TOKEN_SECRET_ID: props.botTokenSecret.secretName,
        LOG_LEVEL: getLogLevel(props.environment),
      },
      description: "Handles all slash commands.",
    });
    props.table.grantReadWriteData(this.slashCommandWorker);
    props.cacheTable.grantReadWriteData(this.slashCommandWorker);
    props.parameters.applicationId.grantRead(this.slashCommandWorker);
    props.botTokenSecret.grantRead(this.slashCommandWorker);

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
