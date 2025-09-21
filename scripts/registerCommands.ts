import { config } from "dotenv";
import { REST, Routes, SlashCommandBuilder } from "/opt/nodejs/discord";

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

// Define your commands here
const commands = [
  new SlashCommandBuilder()
    .setName("ranking")
    .setDescription("Get LeetCode ranking information")
    .addStringOption((option) =>
      option
        .setName("username")
        .setDescription("LeetCode username")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("speed")
    .setDescription("Get speed statistics")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Fastest or slowest")
        .setRequired(false)
        .addChoices(
          { name: "fastest", value: "fastest" },
          { name: "slowest", value: "slowest" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Message type")
        .setRequired(false)
        .addChoices(
          { name: "leet", value: "leet" },
          { name: "leeb", value: "leeb" },
          { name: "failed leet", value: "failed_leet" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("window")
        .setDescription("Time window")
        .setRequired(false)
        .addChoices(
          { name: "Daily", value: "daily" },
          { name: "Weekly", value: "weekly" },
          { name: "Monthly", value: "monthly" },
        ),
    ),
].map((command) => command.toJSON());

const rest = new REST().setToken(TOKEN);

async function registerCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

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
