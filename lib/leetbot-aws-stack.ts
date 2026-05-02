import { Stack, type StackProps, Tags } from "aws-cdk-lib";
import { type Construct } from "constructs";
import { LambdaLayers } from "./constructs/Discord/LambdaLayers";
import { DiscordBot } from "@/lib/constructs/Discord/DiscordBot/DiscordBot";
import { Table } from "./constructs/Table";
import { DiscordCommandHandler } from "@/lib/constructs/Discord/DiscordCommandHandler/DiscordCommandHandler";
import { DiscordParameters } from "@/lib/constructs/Discord/DiscordParameters";
import { CacheTable } from "@/lib/constructs/CacheTable";
import { DiscordAlarmNotifications } from "@/lib/constructs/DiscordAlarmNotifications";
import { LambdaEventScheduler } from "@/lib/constructs/generic/EventScheduler/LambdaEventScheduler";
import { SeasonEnd } from "@/lib/constructs/Discord/SeasonEnd/SeasonEnd";

/**
 * Main CloudFormation stack
 */
export class LeetbotAwsStack extends Stack {
  private readonly lambdaLayers: LambdaLayers;
  private readonly table: Table;
  private readonly cacheTable: CacheTable;
  private readonly discordBot: DiscordBot;
  private readonly seasonEnd: SeasonEnd;
  private readonly discordCommandHandler: DiscordCommandHandler;
  private readonly discordAlarmNotifications: DiscordAlarmNotifications;
  private readonly discordParameters: DiscordParameters;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const deploymentEnvironment =
      this.node.tryGetContext("deploymentEnvironment") ?? "dev";

    this.setTags();

    this.lambdaLayers = new LambdaLayers(this, "Layers");

    this.table = new Table(this, "LeetbotTable", {
      environment: deploymentEnvironment,
    });

    this.cacheTable = new CacheTable(this, "CacheTable");

    this.discordParameters = new DiscordParameters(
      this,
      "DiscordParameters",
      deploymentEnvironment,
    );

    this.discordBot = new DiscordBot(this, "DiscordBot", {
      layers: this.lambdaLayers,
      table: this.table,
      environment: deploymentEnvironment,
      parameters: this.discordParameters,
    });

    this.seasonEnd = new SeasonEnd(this, "SeasonEnd", {
      layers: this.lambdaLayers,
      table: this.table,
      environment: deploymentEnvironment,
      parameters: this.discordParameters,
    });

    new LambdaEventScheduler(this, "DiscordWatcherScheduler", {
      description: "Runs the Discord watcher every day at 13:35 Helsinki time.",
      // Run every day at 13:35 Helsinki time
      scheduleExpression: "cron(35 13 * * ? *)",
      scheduleExpressionTimezone: "Europe/Helsinki",
      target: this.discordBot.discordWatcher,
    });

    this.discordCommandHandler = new DiscordCommandHandler(
      this,
      "DiscordCommands",
      {
        layers: this.lambdaLayers,
        environment: deploymentEnvironment,
        parameters: this.discordParameters,
        table: this.table,
        cacheTable: this.cacheTable,
      },
    );

    this.discordAlarmNotifications = new DiscordAlarmNotifications(
      this,
      "DiscordAlarmNotifications",
      {
        layers: this.lambdaLayers,
        environment: deploymentEnvironment,
      },
    );

    // Register alarms from various constructs to be sent to Discord for monitoring
    [
      this.discordBot.messageEvaluationSubscription.subscriptionAlarm,
      this.discordBot.messageEvaluationSubscription.lambdaFailureAlarm,
      this.seasonEnd.seasonWinnerRoleUpdateSubscription.subscriptionAlarm,
      this.seasonEnd.seasonWinnerRoleUpdateSubscription.lambdaFailureAlarm,
      this.discordCommandHandler.commandProcessingSubscription
        .subscriptionAlarm,
      this.discordCommandHandler.commandProcessingSubscription
        .lambdaFailureAlarm,
      this.discordCommandHandler.metrics.dlqAlarm,
      this.seasonEnd.scheduler.deadLetterQueueAlarm,
    ].forEach((alarm) => {
      if (alarm) {
        this.discordAlarmNotifications.registerAlarm(alarm);
      }
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
