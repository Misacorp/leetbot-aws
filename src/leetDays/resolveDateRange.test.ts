import { resolveDateRange } from "./resolveDateRange";

describe("resolveDateRange", () => {
  it("starts at the beginning when no from date is given", () => {
    expect(resolveDateRange(undefined, "2026-03-01")).toEqual({
      fromDate: "2000-01-01",
      toDate: "2026-03-01",
    });
  });

  it("starts at the given from date (inclusive)", () => {
    expect(resolveDateRange("2026-02-01", "2026-03-01")).toEqual({
      fromDate: "2026-02-01",
      toDate: "2026-03-01",
    });
  });

  it("has no end when no to date is given", () => {
    expect(resolveDateRange("2026-02-01", undefined)).toEqual({
      fromDate: "2026-02-01",
      toDate: undefined,
    });
  });

  it("reads a single day when from and to are the same date", () => {
    expect(resolveDateRange("2026-03-01", "2026-03-01")).toEqual({
      fromDate: "2026-03-01",
      toDate: "2026-03-01",
    });
  });

  it("returns null when the range starts after its end", () => {
    expect(resolveDateRange("2026-03-02", "2026-03-01")).toBeNull();
  });
});
