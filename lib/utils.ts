import * as cdk from "aws-cdk-lib";

export type CustomResourceRemovalPolicy = "DESTROY" | "RETAIN";

/**
 * Transforms a removal policy to one that a CFN custom resource accepts
 */
export function toCustomResourceRemovalPolicy(
  removalPolicy: cdk.RemovalPolicy,
): CustomResourceRemovalPolicy {
  if (removalPolicy === cdk.RemovalPolicy.RETAIN) {
    return "RETAIN";
  }

  return "DESTROY";
}
