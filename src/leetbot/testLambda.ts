import { discordSdkLayer } from "/opt/nodejs/discordSdkLayer";

export const handler = () => {
  console.log("testLambda handler called");

  discordSdkLayer();
};
