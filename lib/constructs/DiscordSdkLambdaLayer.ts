import {
  Architecture,
  Code,
  LayerVersion,
  Runtime,
} from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class DiscordSdkLambdaLayer extends Construct {
  public readonly layer: LayerVersion;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.layer = new LayerVersion(this, "DiscordSdkLayerVersion", {
      layerVersionName: "DiscordSdkLayerVersion",
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      // TypeScript should compile our layer code here
      code: Code.fromAsset("./dist/src/discordSdk/layer/nodejs"),
      compatibleArchitectures: [Architecture.ARM_64],
    });
  }
}
