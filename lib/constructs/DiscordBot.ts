import path from "path";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsManager from "aws-cdk-lib/aws-secretsmanager";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import type { LayerVersion } from "aws-cdk-lib/aws-lambda";

interface Props {
  layer: LayerVersion;
}

export class DiscordBot extends Construct {
  public readonly discordWatcher: NodejsFunction;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Create a place in AWS Secrets Manager to store our bot token
    const secret = new secretsManager.Secret(this, "DiscordBotToken", {
      description: "Discord bot token secret",
      removalPolicy: RemovalPolicy.DESTROY, // TODO: Change when moving away from the AWS sandbox account
    });

    new cdk.CfnOutput(this, "DiscordBotTokenArn", {
      value: secret.secretArn,
    });

    this.discordWatcher = new NodejsFunction(this, "DiscordWatcher", {
      runtime: lambda.Runtime.NODEJS_18_X,
      architecture: lambda.Architecture.ARM_64,
      entry: path.join(__dirname, "../../src/leetbot/discordWatcher.ts"),
      handler: "handler",
      timeout: Duration.minutes(5),
      memorySize: 128,
      logRetention: RetentionDays.THREE_DAYS,
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

    secret.grantRead(this.discordWatcher);
  }
}
