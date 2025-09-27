import { config } from "dotenv";
import { REST, Routes } from "/opt/nodejs/discord";
import { ALL_COMMAND_SCHEMAS } from "../src/discordCommands/core/registry";

// dev, prd, etc.
const env = process.env.NODE_ENV || "dev";
const envFile = `.env.${env}`;
config({ path: envFile });

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID; // Application id
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Optional: for guild-specific commands during development

if (!TOKEN || !CLIENT_ID) {
  throw new Error(
    "Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID environment variables",
  );
}

// Use type-safe command schemas for registration
const commands = ALL_COMMAND_SCHEMAS.map((schema) => {
  // Convert readonly schema to a plain mutable object for REST call
  return JSON.parse(JSON.stringify(schema));
});

const rest = new REST().setToken(TOKEN);

async function registerCommands() {
  try {
    console.log("Started refreshing application (/) commands.");
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

registerCommands();
