import logger from "@logger";
import nacl from "tweetnacl";

export interface DiscordVerificationParams {
  headers: Record<string, string | undefined>;
  body: string;
  publicKey: string;
  isBase64Encoded?: boolean;
}

/**
 * Converts a hex-encoded string to a Uint8Array.
 * Purpose: support Ed25519 verification and other crypto helpers.
 */
export const hexToUint8 = (hex: string): Uint8Array => {
  if (!/^([0-9a-fA-F]{2})+$/.test(hex)) throw new Error("Invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
};

/**
 * Encodes a string to UTF-8 bytes.
 * Purpose: provide a consistent text→bytes helper for signature checks.
 */
export const textToUint8 = (s: string) => new TextEncoder().encode(s);

/**
 * Verifies the authenticity of a Discord webhook request using Ed25519 signature verification.
 * Extracts signature headers and validates the request authenticity.
 *
 * @param params - The verification parameters including headers, body, and public key
 * @returns The decoded body if verification succeeds
 * @throws DiscordAuthenticationError if verification fails
 */
export const verifyDiscordSignature = (
  params: DiscordVerificationParams,
): string => {
  logger.debug("⏳ Verifying Discord signature…");

  const { headers, body, publicKey, isBase64Encoded = false } = params;

  // Extract signature headers (case-insensitive)
  const signature =
    headers?.["x-signature-ed25519"] || headers?.["X-Signature-Ed25519"];
  const timestamp =
    headers?.["x-signature-timestamp"] || headers?.["X-Signature-Timestamp"];

  if (!signature || !timestamp) {
    throw new Error("missing signature headers");
  }

  if (!body || !publicKey) {
    throw new Error("missing required parameters for signature verification");
  }

  // Decode the body if it's base64 encoded
  const decodedBody = isBase64Encoded
    ? Buffer.from(body, "base64").toString("utf8")
    : body;

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(signature)) {
    throw new Error("invalid signature format (must be hex)");
  }

  if (!/^[0-9a-fA-F]+$/.test(publicKey)) {
    throw new Error("invalid public key format (must be hex)");
  }

  // Prepare verification data
  const message = textToUint8(timestamp + decodedBody);
  const signatureBytes = hexToUint8(signature);
  const publicKeyBytes = hexToUint8(publicKey);

  // Verify the signature using tweetnacl
  const isValid = nacl.sign.detached.verify(
    message,
    signatureBytes,
    publicKeyBytes,
  );

  if (!isValid) {
    logger.debug(
      "❌ Discord signature is not valid. (It was parsed successfully but just didn't pass verification.)",
    );
    throw new Error("invalid signature");
  }

  logger.debug("✅ Discord signature is valid.");
  return decodedBody;
};
