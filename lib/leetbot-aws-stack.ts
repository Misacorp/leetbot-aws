import { Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DiscordSdkLambdaLayer } from "./constructs/DiscordSdkLambdaLayer";
import { DiscordBot } from "./constructs/DiscordBot";

/**
 * Main CloudFormation stack
 */
export class LeetbotAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.setTags();

    const layer = new DiscordSdkLambdaLayer(
      this,
      "DiscordLambdaLayerConstruct",
    );

    new DiscordBot(this, "DiscordBot", {
      layer,
    });
  }

  /**
   * Sets stack tags according to an agreed-upon convention
   */
  private setTags = () => {
    Tags.of(this).add("Owner", "misa.jokisalo@knowit.fi");
    Tags.of(this).add("Solution", "leetbot-aws");
  };
}
