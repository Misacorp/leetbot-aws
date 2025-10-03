import {
  Architecture,
  Code,
  type ILayerVersion,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export interface ILambdaLayers {
  discordLayer: ILayerVersion;
  dateFnsLayer: ILayerVersion;
}

export class LambdaLayers extends Construct implements ILambdaLayers {
  public readonly discordLayer: ILayerVersion;

  public readonly dateFnsLayer: ILayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Discord.js
    this.discordLayer = new LayerVersion(this, "DiscordLayer", {
      layerVersionName: "DiscordLayerVersion",
      compatibleRuntimes: [Runtime.NODEJS_22_X],
      code: Code.fromAsset("./src/layers/discord"),
      compatibleArchitectures: [Architecture.ARM_64],
      description: "discord.js Lambda layer",
    });

    // date-fns  with timezones
    this.dateFnsLayer = new LayerVersion(this, "DateFnsLayer", {
      layerVersionName: "DateFnsLambdaLayer",
      compatibleRuntimes: [Runtime.NODEJS_22_X],
      code: Code.fromAsset("./src/layers/date-fns"),
      compatibleArchitectures: [Architecture.ARM_64],
      description: "date-fns with timezones Lambda layer",
    });
  }
}
