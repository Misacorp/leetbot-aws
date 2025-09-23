import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";

export interface IDiscordParameters {
  applicationId: ssm.StringParameter;
  publicKey: ssm.StringParameter;
}

/**
 * DiscordParameters in AWS SSM
 */
export class DiscordParameters extends Construct implements IDiscordParameters {
  public readonly applicationId: ssm.StringParameter;
  public readonly publicKey: ssm.StringParameter;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.applicationId = new ssm.StringParameter(this, "DiscordApplicationId", {
      stringValue: "change-me",
      description: "Discord Application ID (Client ID)",
    });

    this.publicKey = new ssm.StringParameter(this, "DiscordPublicKey", {
      stringValue: "change-me",
      description: "Discord Public Key for webhook signature verification",
    });

    // Scripts rely on these outputs
    new cdk.CfnOutput(this, "DiscordApplicationIdParameter", {
      value: this.applicationId.parameterName,
      description: "SSM Parameter name for Discord Application ID",
    });

    new cdk.CfnOutput(this, "DiscordPublicKeyParameter", {
      value: this.publicKey.parameterName,
      description: "SSM Parameter name for Discord Public Key",
    });
  }
}
