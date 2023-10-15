import {
  Architecture,
  Code,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class LambdaLayers extends Construct {
  public readonly discordLayer: LayerVersion;

  public readonly dateFnsLayer: LayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Discord.js
    this.discordLayer = new LayerVersion(this, "DiscordLayer", {
      layerVersionName: "DiscordLayerVersion",
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      code: Code.fromAsset("./src/layers/discord"),
      compatibleArchitectures: [Architecture.ARM_64],
      description: "discord.js Lambda layer",
    });

    // date-fns  with timezones
    this.dateFnsLayer = new LayerVersion(this, "DateFnsLayer", {
      layerVersionName: "DateFnsLambdaLayer",
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      code: Code.fromAsset("./src/layers/date-fns"),
      compatibleArchitectures: [Architecture.ARM_64],
      description: "date-fns with timezones Lambda layer",
    });
  }
}
