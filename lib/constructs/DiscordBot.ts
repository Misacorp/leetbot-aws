import path from "path";
import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { LayerVersion } from "aws-cdk-lib/aws-lambda";

interface Props {
  layer: LayerVersion;
}

export class DiscordBot extends Construct {
  private readonly testFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Create a place in AWS Secrets Manager to store our bot token
    const secret = new secretsmanager.Secret(this, "DiscordBotToken", {
      description: "Discord bot token secret",
      removalPolicy: RemovalPolicy.DESTROY, // TODO: Change when moving away from the AWS sandbox account
    });

    new cdk.CfnOutput(this, "DiscordBotTokenArn", {
      value: secret.secretArn,
    });

    this.testFunction = new NodejsFunction(this, "TestFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, "../../src/leetbot/testLambda.ts"),
      handler: "handler",
      timeout: Duration.seconds(30),
      memorySize: 128,
      logRetention: RetentionDays.ONE_DAY,
      bundling: {
        minify: false,
        externalModules: ["@aws-sdk/*", "discord.js"],
      },
      layers: [props.layer],
      environment: {
        TOKEN_SECRET_ID: secret.secretName,
      },
      description: "Test function that uses a Lambda layer",
    });

    secret.grantRead(this.testFunction);
  }
}
