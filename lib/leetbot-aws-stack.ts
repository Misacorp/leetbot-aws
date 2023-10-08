import { Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DiscordLambdaLayer } from "./constructs/DiscordLambdaLayer";
import { DiscordBot } from "./constructs/DiscordBot";

/**
 * Main CloudFormation stack
 */
export class LeetbotAwsStack extends Stack {
  private readonly discordLambdaLayer: DiscordLambdaLayer;

  private readonly discordBot: DiscordBot;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.setTags();

    this.discordLambdaLayer = new DiscordLambdaLayer(
      this,
      "DiscordLambdaLayerConstruct",
    );

    this.discordBot = new DiscordBot(this, "DiscordBot", {
      layer: this.discordLambdaLayer,
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
