import { config } from "dotenv";
import { REST, Routes } from "/opt/nodejs/discord";
import { ALL_COMMAND_SCHEMAS } from "@/src/discordCommands/core/registry";

// Determine the correct environment for loading environment variables
const env = process.env.NODE_ENV || "dev";
const envFile = `.env.${env}`;
config({ path: envFile });

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  throw new Error(
    "Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID environment variables",
  );
}

const rest = new REST().setToken(TOKEN);

/**
 * Register all commands in the registry
 * @see registry.ts
 */
async function registerCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

    // Convert your command schemas to the format Discord expects
    const commands = ALL_COMMAND_SCHEMAS.map((schema) => {
      // The 'as const satisfies RESTPostAPIApplicationCommandsJSONBody' makes it readonly,
      // but Discord.js expects a mutable object, so we create a plain copy
      return JSON.parse(JSON.stringify(schema));
    });

    console.log(
      `Registering ${commands.length} commands:`,
      commands.map((cmd) => cmd.name).join(", "),
    );

    if (GUILD_ID) {
      // Register guild-specific commands (faster for development)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID), {
        body: commands,
      });
      console.log(`Successfully registered ${commands.length} guild commands.`);
    } else {
      // Register global commands (takes up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(CLIENT_ID!), {
        body: commands,
      });
      console.log(
        `Successfully registered ${commands.length} global commands.`,
      );
    }
  } catch (error) {
    console.error("Error registering commands:", error);
    process.exit(1);
  }
}

(async () => {
  await registerCommands();
})();
