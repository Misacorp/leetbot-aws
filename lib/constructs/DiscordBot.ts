import path from "path";
import { Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import type { DiscordSdkLambdaLayer } from "./DiscordSdkLambdaLayer";

interface Props {
  layer: DiscordSdkLambdaLayer;
}

export class DiscordBot extends Construct {
  private readonly testFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Create a place in AWS Secrets Manager to store our bot token
    const secret = new secretsmanager.Secret(this, "DiscordBotToken", {
      description: "Discord bot token secret",
    });

    new cdk.CfnOutput(this, "DiscordBotTokenArn", {
      value: secret.secretArn,
    });

    this.testFunction = new NodejsFunction(this, "TestFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, "../../src/leetbot/testLambda.ts"),
      handler: "handler",
      timeout: Duration.seconds(10),
      memorySize: 128,
      logRetention: RetentionDays.ONE_DAY,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          "ImportedDiscordSdkLambdaLayer",
          props.layer.layer.layerVersionArn,
        ),
      ],
      environment: {
        TOKEN_SECRET_ID: secret.secretName,
      },
      description: "Test function that uses a Lambda layer",
    });

    secret.grantRead(this.testFunction);
  }
}
