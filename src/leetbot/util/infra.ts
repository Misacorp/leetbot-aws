import * as cdk from "aws-cdk-lib";

export const getRemovalPolicy = () => cdk.RemovalPolicy.DESTROY; // TODO: Change when moving away from the AWS sandbox account
