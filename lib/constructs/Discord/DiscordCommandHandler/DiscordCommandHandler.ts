import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import { ILambdaLayers } from "@/lib/constructs/Discord/LambdaLayers";

interface Props {
  readonly layers: ILambdaLayers;
}

export class DiscordCommandHandler extends Construct {
  public readonly interactionsApi: apigwv2.HttpApi;
  public readonly ingressFunction: NodejsFunction;
  public readonly eventBus: events.EventBus;
  public readonly rankingWorker: NodejsFunction;
  public readonly speedWorker: NodejsFunction;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // SSM Parameters for Discord configuration
    const discordApplicationIdParam = new ssm.StringParameter(
      this,
      "DiscordApplicationId",
      {
        stringValue: "change-me",
        description: "Discord Application ID (Client ID)",
      },
    );

    const discordPublicKeyParam = new ssm.StringParameter(
      this,
      "DiscordPublicKey",
      {
        stringValue: "change-me",
        description: "Discord Public Key for webhook signature verification",
      },
    );

    // Output the parameter names so you know what to update
    new cdk.CfnOutput(this, "DiscordApplicationIdParameter", {
      value: discordApplicationIdParam.parameterName,
      description: "SSM Parameter name for Discord Application ID",
    });

    new cdk.CfnOutput(this, "DiscordPublicKeyParameter", {
      value: discordPublicKeyParam.parameterName,
      description: "SSM Parameter name for Discord Public Key",
    });

    // EventBridge event bus for Discord events
    this.eventBus = new events.EventBus(this, "DiscordEventBus");

    this.ingressFunction = new NodejsFunction(this, "InteractionsIngress", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/discordCommands/ingress.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(10),
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
        PUBLIC_KEY_PARAM_NAME: discordPublicKeyParam.parameterName,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
      },
      description:
        "Discord Interactions ingress: verifies signatures, handles PING, enqueues command events.",
    });

    // Allow ingress to put events onto the bus
    this.eventBus.grantPutEventsTo(this.ingressFunction);
    // Grant permissions to read the SSM parameters
    discordApplicationIdParam.grantRead(this.ingressFunction);
    discordPublicKeyParam.grantRead(this.ingressFunction);

    // Create a log group for API Gateway access logs
    const apiGatewayLogGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs", {
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // IAM role for API Gateway to write to CloudWatch logs
    const apiGatewayLogsRole = new iam.Role(this, "ApiGatewayLogsRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonAPIGatewayPushToCloudWatchLogs",
        ),
      ],
    });

    // Grant API Gateway permission to write to the log group
    apiGatewayLogGroup.grantWrite(apiGatewayLogsRole);

    this.interactionsApi = new apigwv2.HttpApi(this, "DiscordInteractionsApi", {
      description: "HTTP endpoint for Discord Interactions webhook",
      // // Enable detailed access logging
      // defaultDomainMapping: {
      //   domainName: undefined, // No custom domain
      // },
    });

    // Create a stage with access logging enabled
    const defaultStage = this.interactionsApi.defaultStage?.node
      .defaultChild as apigwv2.CfnStage;
    if (defaultStage) {
      defaultStage.accessLogSettings = {
        destinationArn: apiGatewayLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: "$context.requestId",
          requestTime: "$context.requestTime",
          httpMethod: "$context.httpMethod",
          path: "$context.path",
          status: "$context.status",
          error: {
            message: "$context.error.message",
            messageString: "$context.error.messageString",
          },
          responseLength: "$context.responseLength",
          responseLatency: "$context.responseLatency",
          sourceIp: "$context.identity.sourceIp",
          userAgent: "$context.identity.userAgent",
          integrationError: "$context.integration.error",
          integrationStatus: "$context.integration.status",
          integrationLatency: "$context.integration.latency",
        }),
      };
    }

    const interactionsIntegration =
      new apigwv2Integrations.HttpLambdaIntegration(
        "InteractionsIntegration",
        this.ingressFunction,
      );

    this.interactionsApi.addRoutes({
      path: "/interactions",
      methods: [apigwv2.HttpMethod.POST],
      integration: interactionsIntegration,
    });

    // Placeholder worker Lambdas
    this.rankingWorker = new NodejsFunction(this, "RankingLeetWorker", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/discordCommands/rankingWorker.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "RankingLeetWorkerLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      layers: [props.layers.discordLayer],
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*", "discord.js"],
      },
      environment: {},
      description:
        "Processes /ranking leet requests and edits the original Discord response.",
    });

    // Consolidated speed worker Lambda for fastest/slowest; leet/leeb
    this.speedWorker = new NodejsFunction(this, "SpeedWorker", {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      entry: "src/discordCommands/speedWorker.ts",
      handler: "handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logGroup: new logs.LogGroup(this, "SpeedWorkerLogGroup", {
        retention: logs.RetentionDays.THREE_DAYS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
      layers: [props.layers.discordLayer],
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*", "discord.js"],
      },
      environment: {},
      description:
        "Handles speed-style commands: fastest/slowest with metrics like leet/leeb.",
    });

    // EventBridge rules for routing events to workers
    const rankingRule = new events.Rule(this, "RankingLeetRule", {
      eventBus: this.eventBus,
      description: "Route ranking.leet interaction events to ranking worker",
      eventPattern: {
        source: ["discord.interactions"],
        detailType: ["ranking.leet"],
      },
    });
    rankingRule.addTarget(
      new targets.LambdaFunction(this.rankingWorker, {
        maxEventAge: cdk.Duration.minutes(12), // within a 15-min token window
        retryAttempts: 4,
      }),
    );

    // Consolidated speed query rule for fastest/slowest, leet/leeb
    const speedRule = new events.Rule(this, "SpeedQueryRule", {
      eventBus: this.eventBus,
      description:
        "Route speed queries (fastest/slowest, leet/leeb) to a single worker",
      eventPattern: {
        source: ["discord.interactions"],
        detailType: ["speed.query"],
      },
    });
    speedRule.addTarget(
      new targets.LambdaFunction(this.speedWorker, {
        event: events.RuleTargetInput.fromEventPath("$.detail"),
        maxEventAge: cdk.Duration.minutes(12),
        retryAttempts: 4,
      }),
    );

    // Output the API Gateway URL for Discord webhook configuration
    new cdk.CfnOutput(this, "DiscordWebhookUrl", {
      value: `${this.interactionsApi.url}interactions`,
      description:
        "Discord Interactions Endpoint URL - paste this into Discord Developer Portal",
    });

    // Output the event bus name for debugging
    new cdk.CfnOutput(this, "EventBusName", {
      value: this.eventBus.eventBusName,
      description: "EventBridge Event Bus Name",
    });
  }
}
