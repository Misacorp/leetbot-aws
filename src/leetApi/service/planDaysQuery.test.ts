import { planDaysQuery } from "./planDaysQuery";

describe("planDaysQuery", () => {
  it("starts at the beginning when no start date is given", () => {
    expect(planDaysQuery(undefined, "2026-03-01")).toEqual({
      startDate: "2000-01-01",
      lastDate: "2026-03-01",
    });
  });

  it("starts at the given start date (inclusive)", () => {
    expect(planDaysQuery("2026-02-01", "2026-03-01")).toEqual({
      startDate: "2026-02-01",
      lastDate: "2026-03-01",
    });
  });

  it("reads a single day when the start is the latest finalised date", () => {
    expect(planDaysQuery("2026-03-01", "2026-03-01")).toEqual({
      startDate: "2026-03-01",
      lastDate: "2026-03-01",
    });
  });

  it("returns null when the range starts after the latest finalised date", () => {
    expect(planDaysQuery("2026-03-02", "2026-03-01")).toBeNull();
  });
});
