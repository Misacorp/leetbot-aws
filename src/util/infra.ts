import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export const getLogLevel = (environment: string = "dev") =>
  environment === "dev" ? "DEBUG" : "INFO";

export const getRemovalPolicy = (environment: string = "dev") => {
  if (environment === "prd") {
    return cdk.RemovalPolicy.RETAIN;
  }

  return cdk.RemovalPolicy.DESTROY;
};

export function getDefaultLambdaConfig() {
  return {
    runtime: lambda.Runtime.NODEJS_22_X,
    architecture: lambda.Architecture.ARM_64,
    timeout: cdk.Duration.seconds(30),
    memorySize: 256,
    bundling: {
      minify: false,
      externalModules: ["@aws-sdk/*"],
    },
  };
}

export function createLogGroup(
  scope: Construct,
  logGroupName: string,
  environment: string,
) {
  return new logs.LogGroup(scope, logGroupName, {
    retention: logs.RetentionDays.THREE_DAYS,
    removalPolicy: getRemovalPolicy(environment),
  });
}
