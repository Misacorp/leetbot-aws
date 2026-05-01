import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { PLACEHOLDER_PARAM_VALUE } from "@/src/util/constants";
import {
  type ISecureStringParameter,
  SecureStringParameter,
} from "@/lib/constructs/generic/SecureStringParameter/SecureStringParameter";
import { getRemovalPolicy } from "@/src/util/infra";

export interface IDiscordParameters {
  applicationId: ssm.StringParameter;
  publicKey: ssm.StringParameter;
  botToken: ISecureStringParameter;
}

/**
 * DiscordParameters in AWS SSM
 */
export class DiscordParameters extends Construct implements IDiscordParameters {
  public readonly applicationId: ssm.StringParameter;
  public readonly publicKey: ssm.StringParameter;
  public readonly botToken: ISecureStringParameter;

  constructor(scope: Construct, id: string, environment: string) {
    super(scope, id);

    this.applicationId = new ssm.StringParameter(this, "DiscordApplicationId", {
      stringValue: PLACEHOLDER_PARAM_VALUE,
      description: "Discord Application ID (Client ID)",
    });

    this.publicKey = new ssm.StringParameter(this, "DiscordPublicKey", {
      stringValue: PLACEHOLDER_PARAM_VALUE,
      description: "Discord Public Key for webhook signature verification",
    });

    this.botToken = new SecureStringParameter(this, "DiscordBotToken", {
      parameterName: `/leetbot/${environment}/discord/bot-token`,
      placeholderValue: PLACEHOLDER_PARAM_VALUE,
      removalPolicy: getRemovalPolicy(environment),
      // Secrets Manager would be the stronger default here, but this stack
      // intentionally uses SSM SecureString to save on costs.
      description: "Discord bot token",
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

    new cdk.CfnOutput(this, "DiscordBotTokenParameter", {
      value: this.botToken.parameterName,
      description: "SSM parameter name for the Discord bot token",
    });
  }
}
