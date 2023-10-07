import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { Client, Events, IntentsBitField } from "/opt/nodejs/discordSdkLayer";

export const handler = async () => {
  console.log("testLambda handler called");

  const secretsManager = new SecretsManager();
  const tokenResponse = await secretsManager.getSecretValue({
    SecretId: process.env.TOKEN_SECRET_ID!,
  });

  const token = tokenResponse.SecretString;

  if (!token) {
    throw new Error("Unable to get bot token from Secrets Manager");
  }

  console.log("token starts with", token.substring(0, 2));

  const client = new Client({
    intents: new IntentsBitField()
      .add(IntentsBitField.Flags.GuildMessages)
      .add(IntentsBitField.Flags.MessageContent),
    closeTimeout: 300,
  });

  client.once(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`);

    const guild = await client.guilds.fetch("215386000132669440");
    console.log("Guild name:", guild.name);

    console.log("Now logging out...");
    client.destroy();
  });

  client.once(Events.Error, (error) => {
    console.warn("Client exited with an error:", error);
  });

  console.log("Logging in to Discord...");

  // Log in to Discord with your client's token
  client.login(token);
};
