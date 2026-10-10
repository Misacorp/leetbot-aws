import { encodeDaysCursor } from "./daysCursor";
import { isValidGuildId, validateDaysQuery } from "./validateDaysQuery";

describe("validateDaysQuery", () => {
  it("defaults to a limit of 31 with no query", () => {
    expect(validateDaysQuery(undefined)).toEqual({
      ok: true,
      value: { limit: 31 },
    });
    expect(validateDaysQuery({})).toEqual({ ok: true, value: { limit: 31 } });
  });

  it("accepts all parameters and decodes the cursor", () => {
    expect(
      validateDaysQuery({
        after: encodeDaysCursor("2026-03-01"),
        since: "2026-02-01",
        limit: "100",
      }),
    ).toEqual({
      ok: true,
      value: { after: "2026-03-01", since: "2026-02-01", limit: 100 },
    });
  });

  it.each(["1", "31", "100"])("accepts limit %s", (limit) => {
    expect(validateDaysQuery({ limit })).toEqual({
      ok: true,
      value: { limit: Number(limit) },
    });
  });

  it.each(["0", "101", "-1", "1.5", "abc", "", "1e2", " 5", "007", "1,2"])(
    "rejects limit %j",
    (limit) => {
      expect(validateDaysQuery({ limit }).ok).toBe(false);
    },
  );

  it.each([
    "2026-13-01",
    "2026-02-30",
    "2026-1-1",
    "yesterday",
    "",
    "1999-01-01",
  ])("rejects since %j", (since) => {
    expect(validateDaysQuery({ since }).ok).toBe(false);
  });

  it("accepts a leap day", () => {
    expect(validateDaysQuery({ since: "2028-02-29" }).ok).toBe(true);
  });

  it("rejects unknown query parameters", () => {
    expect(validateDaysQuery({ limit: "5", extra: "1" }).ok).toBe(false);
  });

  it("rejects an undecodable cursor", () => {
    expect(validateDaysQuery({ after: "garbage" }).ok).toBe(false);
  });

  it("never echoes caller input in the error message", () => {
    const result = validateDaysQuery({ since: "<script>" });

    expect(result).toEqual({
      ok: false,
      message: expect.not.stringContaining("<script>"),
    });
  });
});

describe("isValidGuildId", () => {
  it.each(["12345678901234567", "123456789012345678", "12345678901234567890"])(
    "accepts %s",
    (id) => {
      expect(isValidGuildId(id)).toBe(true);
    },
  );

  it.each([
    undefined,
    "",
    "1234567890123456",
    "123456789012345678901",
    "1234567890123456a",
    "../etc/passwd",
  ])("rejects %j", (id) => {
    expect(isValidGuildId(id)).toBe(false);
  });
});
