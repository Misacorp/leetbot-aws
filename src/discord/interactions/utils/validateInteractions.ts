import logger from "@logger";
import {
  type APIChatInputApplicationCommandInteraction,
  type APIInteraction,
} from "discord-api-types/v10";
import { updateOriginalResponse } from "@/src/discord/interactions/webhook/updateOriginalResponse";

/**
 * Validates that a given variable is present in the environment and returns it if yes.
 * If not, handles error response to Discord and logging.
 * @return Environment variable value if valid, null if invalid (for an early return pattern).
 */
export async function ensureEnvironmentVariable(
  interaction: Pick<APIInteraction, "id" | "token" | "application_id">,
  variableName: string,
): Promise<string | null> {
  const ENV_VALUE = process.env[variableName];
  if (!ENV_VALUE) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content:
          "🤖 Oopsie! I don't know where to look for messages. There's nothing you can do about it so please let my creator know.",
      },
    });
    logger.error(
      `${variableName} environment variable is not defined. Processing this event is not possible and it will not be retried.`,
    );
    return null;
  }

  return ENV_VALUE;
}

/**
 * Validates that a Discord interaction has a `guild_id` property and returns it if yes.
 * If not, handles error response to Discord and logging.
 * @return Guild ID if valid, null if invalid (for an early return pattern).
 */
export async function ensureGuildId(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<string | null> {
  if (!interaction.guild_id) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content:
          "🤖 Oopsie! Discord didn't give me enough data to complete your request. There's nothing you can do about it so please let my creator know.",
      },
    });
    logger.error(
      { guild_id: interaction.guild_id, "user.id": interaction.user?.id },
      "Guild id is not defined in the interaction. Processing this event is not possible and it will not be retried.",
    );
    return null;
  }

  return interaction.guild_id;
}
