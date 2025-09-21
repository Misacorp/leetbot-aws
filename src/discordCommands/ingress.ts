import logger from "@logger";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import nacl from "tweetnacl";
import { json, hexToUint8, textToUint8, normalizeCommandToEvent } from "./util";
import { getParameter } from "@/src/util/ssm";

const PUBLIC_KEY_PARAM_NAME = process.env.PUBLIC_KEY_PARAM_NAME;
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME;

const eb = new EventBridgeClient({});

/**
 * Ingress for Discord Interactions. Verifies signatures, acks within 3s,
 * and publishes a normalized event to EventBridge so downstream workers can
 * complete the actual response. This keeps the Gateway client out of band,
 * preserves a single bot token, and provides clean routing & retries.
 */
export const handler = async (event: any) => {
  logger.debug({ event }, "Discord ingress handler invoked");

  if (!PUBLIC_KEY_PARAM_NAME) {
    logger.error("PUBLIC_KEY_PARAM_NAME environment variable is missing");
    throw new Error("PUBLIC_KEY_PARAM_NAME is required");
  }

  try {
    const sig =
      event.headers?.["x-signature-ed25519"] ||
      event.headers?.["X-Signature-Ed25519"];
    const ts =
      event.headers?.["x-signature-timestamp"] ||
      event.headers?.["X-Signature-Timestamp"];

    logger.debug(
      {
        hasSignature: !!sig,
        hasTimestamp: !!ts,
        isBase64Encoded: event.isBase64Encoded,
      },
      "Processing Discord signature headers",
    );

    if (!sig || !ts) {
      logger.warn("Missing Discord signature headers");
      return json(401, { error: "missing signature headers" });
    }

    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";

    logger.debug({ bodyLength: raw.length }, "Decoded request body");

    // Get the public key from SSM
    logger.debug(
      { parameterName: PUBLIC_KEY_PARAM_NAME },
      "Fetching Discord public key from SSM",
    );
    const publicKey = await getParameter(PUBLIC_KEY_PARAM_NAME, true);
    if (!publicKey) {
      logger.error("Discord public key not configured in SSM");
      return json(500, { error: "configuration error" });
    }
    logger.debug("Successfully retrieved Discord public key from SSM");

    // Verify Discord signature
    logger.debug("Verifying Discord signature");

    try {
      // Log the values we're working with (but mask sensitive data)
      logger.debug(
        {
          timestampLength: ts.length,
          signatureLength: sig.length,
          publicKeyLength: publicKey.length,
          rawBodyLength: raw.length,
          signaturePrefix: sig.substring(0, 8) + "...",
          publicKeyPrefix: publicKey.substring(0, 8) + "...",
          isValidHexSig: /^[0-9a-fA-F]+$/.test(sig),
          isValidHexPublicKey: /^[0-9a-fA-F]+$/.test(publicKey),
        },
        "Signature verification inputs",
      );

      const message = textToUint8(ts + raw);
      const signature = hexToUint8(sig);
      const pubKey = hexToUint8(publicKey);

      logger.debug(
        {
          messageLength: message.length,
          signatureBytes: signature.length,
          publicKeyBytes: pubKey.length,
        },
        "Converted signature verification data",
      );

      const ok = nacl.sign.detached.verify(message, signature, pubKey);

      if (!ok) {
        logger.warn(
          {
            timestampLength: ts.length,
            bodyLength: raw.length,
            signatureValid: /^[0-9a-fA-F]+$/.test(sig),
            publicKeyValid: /^[0-9a-fA-F]+$/.test(publicKey),
          },
          "Discord signature verification failed",
        );
        return json(401, { error: "invalid signature" });
      }

      logger.debug("Discord signature verified successfully");
    } catch (verifyError) {
      logger.error(
        {
          error: verifyError,
          timestampLength: ts?.length,
          signatureLength: sig?.length,
          publicKeyLength: publicKey?.length,
          signatureValid: sig ? /^[0-9a-fA-F]+$/.test(sig) : false,
          publicKeyValid: publicKey ? /^[0-9a-fA-F]+$/.test(publicKey) : false,
        },
        "Error during signature verification",
      );

      return json(500, { error: "signature verification error" });
    }

    const interaction = JSON.parse(raw);
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
      return json(200, { type: 1 }); // PONG
    }

    // Only handle application commands and component interactions here
    if (interaction?.type !== 2) {
      logger.debug(
        { interactionType: interaction?.type },
        "Interaction type not supported, sending deferred response",
      );
      return json(200, { type: 5, data: { flags: 64 } });
    }

    // Normalize command → event
    const { detailType, detail } = normalizeCommandToEvent(interaction);
    logger.debug(
      {
        detailType,
        guildId: detail.interaction?.guild_id,
        channelId: detail.interaction?.channel_id,
        invokerId: detail.interaction?.invoker_id,
      },
      "Normalized Discord interaction to EventBridge event",
    );

    // Publish to EventBridge (include token for now; migrate to token_ref later if desired)
    const eventPayload = {
      Source: "discord.interactions",
      DetailType: detailType,
      EventBusName: EVENT_BUS_NAME,
      Time: new Date(),
      Detail: JSON.stringify(detail),
    };

    logger.debug(
      {
        eventBusName: EVENT_BUS_NAME,
        detailType,
        payloadSize: JSON.stringify(eventPayload).length,
        hasEventBusName: !!EVENT_BUS_NAME,
      },
      "Publishing event to EventBridge",
    );

    try {
      const result = await eb.send(
        new PutEventsCommand({
          Entries: [eventPayload],
        }),
      );

      logger.debug(
        {
          result: result.Entries,
          failedEntryCount: result.FailedEntryCount,
        },
        "EventBridge publish result",
      );

      if (result.FailedEntryCount && result.FailedEntryCount > 0) {
        logger.error(
          {
            failedEntries: result.Entries?.filter((entry) => entry.ErrorCode),
          },
          "Some EventBridge entries failed",
        );
      }
    } catch (ebError) {
      logger.error(
        {
          error: ebError,
          eventBusName: EVENT_BUS_NAME,
          payloadSize: JSON.stringify(eventPayload).length,
        },
        "EventBridge publish failed",
      );
      throw ebError; // Re-throw to hit the outer catch
    }

    logger.debug("Successfully published event to EventBridge");

    // Deferred ack (ephemeral by default)
    logger.debug("Sending deferred acknowledgment to Discord");
    return json(200, { type: 5, data: { flags: 64 } });
  } catch (err) {
    logger.error({ error: err }, "Discord ingress error");
    return json(500, { error: "internal error" });
  }
};
