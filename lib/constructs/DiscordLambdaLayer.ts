import {
  Architecture,
  Code,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class DiscordLambdaLayer extends LayerVersion {
  public readonly layer: LayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      layerVersionName: "DiscordLayerVersion",
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      code: Code.fromAsset("./src/layers/discord"),
      compatibleArchitectures: [Architecture.ARM_64],
      description: "discord.js Lambda layer",
    });
  }
}
