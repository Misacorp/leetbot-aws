import { decodeDaysCursor, encodeDaysCursor } from "./daysCursor";

describe("daysCursor", () => {
  it("round trips a date", () => {
    const cursor = encodeDaysCursor("2026-03-29");

    expect(decodeDaysCursor(cursor)).toBe("2026-03-29");
  });

  it("is base64url of the documented JSON shape", () => {
    expect(
      JSON.parse(
        Buffer.from(encodeDaysCursor("2026-03-29"), "base64url").toString(),
      ),
    ).toEqual({ d: "2026-03-29" });
    expect(encodeDaysCursor("2026-03-29")).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  it.each([
    ["empty", ""],
    ["not base64url", "not a cursor!"],
    ["standard base64 characters", "ey+/"],
    ["not JSON", Buffer.from("hello").toString("base64url")],
    ["a JSON array", encode(["2026-03-29"])],
    ["a JSON string", encode("2026-03-29")],
    ["null", encode(null)],
    ["missing d", encode({ x: "2026-03-29" })],
    ["extra keys", encode({ d: "2026-03-29", e: 1 })],
    ["non-string date", encode({ d: 20260329 })],
    ["impossible date", encode({ d: "2026-02-30" })],
    ["wrong date format", encode({ d: "29.3.2026" })],
    ["too long", "A".repeat(65)],
  ])("rejects a cursor that is %s", (_name, cursor) => {
    expect(decodeDaysCursor(cursor)).toBeNull();
  });

  it("rejects a non-canonical encoding of a valid cursor", () => {
    const padded = `${encodeDaysCursor("2026-03-29")}=`;

    expect(decodeDaysCursor(padded)).toBeNull();
  });
});
