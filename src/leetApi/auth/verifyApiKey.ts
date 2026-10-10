import { createHash, timingSafeEqual } from "node:crypto";
import { PLACEHOLDER_PARAM_VALUE } from "@/src/util/constants";

export type ApiKeyVerdict = "ok" | "unauthorized" | "not_configured";

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const MAX_KEY_LENGTH = 512;
const BEARER_PATTERN = /^Bearer ([^\s]+)$/i;

/**
 * SHA-256 of an API key as lowercase hex.
 */
export const hashApiKey = (key: string): string =>
  createHash("sha256").update(key, "utf8").digest("hex");

/**
 * Parses the comma-separated list of key hashes kept in Parameter Store.
 * Entries that are not SHA-256 hex are ignored.
 */
export const parseKeyHashes = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => SHA256_HEX_PATTERN.test(entry));

/**
 * Reads the key from an `Authorization: Bearer <key>` header value.
 */
export const extractBearerToken = (
  header: string | undefined,
): string | null => {
  if (!header) {
    return null;
  }

  const token = BEARER_PATTERN.exec(header)?.[1];
  return token && token.length <= MAX_KEY_LENGTH ? token : null;
};

/**
 * Checks a presented key against the configured hashes in constant time.
 * Fails closed with `not_configured` while the parameter holds the placeholder
 * or nothing usable.
 */
export const verifyApiKey = ({
  presentedKey,
  configuredValue,
}: {
  presentedKey: string;
  configuredValue: string;
}): ApiKeyVerdict => {
  if (!configuredValue || configuredValue === PLACEHOLDER_PARAM_VALUE) {
    return "not_configured";
  }

  const configuredHashes = parseKeyHashes(configuredValue);
  if (configuredHashes.length === 0) {
    return "not_configured";
  }

  const presentedHash = createHash("sha256")
    .update(presentedKey, "utf8")
    .digest();

  // Compare against every hash, without stopping at the first match
  let matched = false;
  for (const configuredHash of configuredHashes) {
    const expected = Buffer.from(configuredHash, "hex");
    if (
      expected.length === presentedHash.length &&
      timingSafeEqual(presentedHash, expected)
    ) {
      matched = true;
    }
  }

  return matched ? "ok" : "unauthorized";
};
