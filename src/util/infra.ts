import * as cdk from "aws-cdk-lib";

export const getRemovalPolicy = (environment: string = "dev") => {
  if (environment === "prd") {
    return cdk.RemovalPolicy.RETAIN;
  }

  return cdk.RemovalPolicy.DESTROY;
};
