import { Stack, type StackProps, Tags } from "aws-cdk-lib";
import { type Construct } from "constructs";
import { LambdaLayers } from "./constructs/LambdaLayers";
import { DiscordBot } from "./constructs/DiscordBot";
import { EventScheduler } from "./constructs/EventScheduler";

/**
 * Main CloudFormation stack
 */
export class LeetbotAwsStack extends Stack {
  private readonly lambdaLayers: LambdaLayers;

  private readonly discordBot: DiscordBot;

  private readonly scheduler: EventScheduler;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.setTags();

    this.lambdaLayers = new LambdaLayers(this, "Layers");

    this.discordBot = new DiscordBot(this, "DiscordBot", {
      layers: this.lambdaLayers,
    });

    this.scheduler = new EventScheduler(this, "EventScheduler", {
      target: this.discordBot.discordWatcher,
      // Run every day at 13:36 Helsinki time
      scheduleExpression: "cron(35 13 * * ? *)",
      scheduleExpressionTimezone: "Europe/Helsinki",
    });
  }

  /**
   * Sets stack tags according to an agreed-upon convention
   */
  private setTags = () => {
    Tags.of(this).add("Owner", "misa.jokisalo@gmail.com");
    Tags.of(this).add("Solution", "leetbot-aws");
  };
}
