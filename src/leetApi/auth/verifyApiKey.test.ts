import {
  extractBearerToken,
  hashApiKey,
  parseKeyHashes,
  verifyApiKey,
} from "./verifyApiKey";

const KEY_A = "key-a-0123456789abcdefghijklmnopqrstuvwxyz";
const KEY_B = "key-b-0123456789abcdefghijklmnopqrstuvwxyz";

describe("verifyApiKey", () => {
  it("hashes to lowercase SHA-256 hex", () => {
    // sha256("abc")
    expect(hashApiKey("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("accepts a valid key", () => {
    expect(
      verifyApiKey({
        presentedKey: KEY_A,
        configuredValue: hashApiKey(KEY_A),
      }),
    ).toBe("ok");
  });

  it("rejects a wrong key", () => {
    expect(
      verifyApiKey({
        presentedKey: KEY_B,
        configuredValue: hashApiKey(KEY_A),
      }),
    ).toBe("unauthorized");
  });

  it("rejects the stored hash used as a key", () => {
    expect(
      verifyApiKey({
        presentedKey: hashApiKey(KEY_A),
        configuredValue: hashApiKey(KEY_A),
      }),
    ).toBe("unauthorized");
  });

  it("accepts either of two keys for rotation", () => {
    const configuredValue = `${hashApiKey(KEY_A)},${hashApiKey(KEY_B)}`;

    expect(verifyApiKey({ presentedKey: KEY_A, configuredValue })).toBe("ok");
    expect(verifyApiKey({ presentedKey: KEY_B, configuredValue })).toBe("ok");
    expect(verifyApiKey({ presentedKey: "other", configuredValue })).toBe(
      "unauthorized",
    );
  });

  it("tolerates whitespace and uppercase hex in the configured list", () => {
    const configuredValue = ` ${hashApiKey(KEY_A).toUpperCase()} , ${hashApiKey(KEY_B)} `;

    expect(verifyApiKey({ presentedKey: KEY_A, configuredValue })).toBe("ok");
  });

  it("fails closed while the parameter holds the placeholder", () => {
    expect(
      verifyApiKey({ presentedKey: "change-me", configuredValue: "change-me" }),
    ).toBe("not_configured");
  });

  it("fails closed when the parameter is empty or holds no valid hash", () => {
    expect(verifyApiKey({ presentedKey: KEY_A, configuredValue: "" })).toBe(
      "not_configured",
    );
    expect(
      verifyApiKey({ presentedKey: KEY_A, configuredValue: "not-a-hash,,abc" }),
    ).toBe("not_configured");
  });

  it("ignores malformed entries next to a valid hash", () => {
    const configuredValue = `garbage,${hashApiKey(KEY_A)}`;

    expect(verifyApiKey({ presentedKey: KEY_A, configuredValue })).toBe("ok");
  });
});

describe("parseKeyHashes", () => {
  it("keeps only well-formed hashes", () => {
    const hash = hashApiKey(KEY_A);

    expect(parseKeyHashes(`${hash},short,${"g".repeat(64)}`)).toEqual([hash]);
  });
});

describe("extractBearerToken", () => {
  it("reads the token from a Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
  });

  it.each([
    undefined,
    "",
    "Bearer",
    "Bearer ",
    "Basic abc123",
    "abc123",
    "Bearer a b",
    `Bearer ${"a".repeat(513)}`,
  ])("rejects %j", (header) => {
    expect(extractBearerToken(header)).toBeNull();
  });
});
