/**
 * Builds a minimal API Gateway/Lambda proxy JSON response.
 * Purpose: keep handlers focused on logic by centralizing HTTP formatting.
 */
export const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

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
