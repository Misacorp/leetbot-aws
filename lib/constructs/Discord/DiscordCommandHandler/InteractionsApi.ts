import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigwV2 from "aws-cdk-lib/aws-apigatewayv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

export interface IInteractionsApi {
  api: apigwV2.HttpApi;
}

export class InteractionsApi extends Construct implements IInteractionsApi {
  public readonly api: apigwV2.HttpApi;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Log group for API Gateway access logs
    const apiGatewayLogGroup = new logs.LogGroup(this, "ApiGatewayAccessLogs", {
      retention: logs.RetentionDays.ONE_DAY, // Used for debugging - short-lived
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

    // Interactions API root
    this.api = new apigwV2.HttpApi(this, "InteractionsApiRoot", {
      description: "HTTP endpoint for Discord Interactions webhook",
    });

    // Create a stage with access logging enabled
    const defaultStage = this.api.defaultStage?.node
      .defaultChild as apigwV2.CfnStage;
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

    // Output the API Gateway URL for Discord webhook configuration
    new cdk.CfnOutput(this, "DiscordWebhookUrl", {
      value: `${this.api.url}interactions`,
      description:
        "Discord Interactions Endpoint URL - paste this into Discord Developer Portal",
    });
  }
}
