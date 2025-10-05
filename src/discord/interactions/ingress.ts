import logger from "@logger";
import {
  discordAuthError,
  discordDeferEphemeral,
  discordDeferPublic,
  discordPong,
  json,
} from "./utils/discordResponses";
import { getParameter } from "@/src/util/ssm";
import { publishMessage } from "@/src/util/sns";
import { verifyDiscordSignature } from "./utils/discordSignatureVerification";

const PUBLIC_KEY_PARAM_NAME = process.env.PUBLIC_KEY_PARAM_NAME;
const COMMAND_PROCESSING_TOPIC_ARN = process.env.COMMAND_PROCESSING_TOPIC_ARN;

/**
 * Ingress for Discord Interactions.
 * Verifies signatures and ACKs within 3 seconds.
 * Passes commands to a downstream Lambda for actual processing.
 */
export const handler = async (event: any) => {
  logger.debug({ event }, "Discord ingress handler invoked");

  try {
    // Ensure environment variables are present
    if (!PUBLIC_KEY_PARAM_NAME) {
      logger.error("PUBLIC_KEY_PARAM_NAME environment variable is missing");
      throw new Error("PUBLIC_KEY_PARAM_NAME is required");
    }
    if (!COMMAND_PROCESSING_TOPIC_ARN) {
      logger.error("COMMAND_PROCESSING_TOPIC_ARN is missing");
      throw new Error("COMMAND_PROCESSING_TOPIC_ARN is required");
    }

    // Get the public key from SSM
    const publicKey = await getParameter(PUBLIC_KEY_PARAM_NAME, true);
    if (!publicKey) {
      logger.error("Discord public key not configured in SSM");
      return json(500, { error: "configuration error" });
    }

    // Verify the request
    let decodedBody;
    try {
      decodedBody = verifyDiscordSignature({
        headers: event.headers || {},
        body: event.body || "",
        publicKey,
        isBase64Encoded: event.isBase64Encoded,
      });
    } catch (error) {
      return discordAuthError("authentication failed");
    }

    const interaction = JSON.parse(decodedBody);
    logger.debug(
      {
        interactionType: interaction?.type,
        interactionId: interaction?.id,
        commandName: interaction?.data?.name,
      },
      "Parsed Discord interaction",
    );

    // PING
    if (interaction?.type === 1) {
      logger.debug("Handling Discord PING request");

      return discordPong();
    }

    // ✅ Pass the interaction onward for further processing
    await publishMessage({
      TopicArn: COMMAND_PROCESSING_TOPIC_ARN,
      Message: JSON.stringify(interaction),
    });

    // Application commands are ephemeral
    if (interaction?.type === 2) {
      return discordDeferEphemeral();
    }

    // Handle other interactions as public
    return discordDeferPublic();
  } catch (err) {
    logger.error({ error: err }, "Discord ingress error");

    return discordAuthError("internal error");
  }
};
