import { createServiceInput } from "./createServiceInput";

describe("createServiceInput", () => {
  it("has no start date when neither after nor since is given", () => {
    expect(createServiceInput({ limit: 31 })).toEqual({
      fromDate: undefined,
      limit: 31,
    });
  });

  it("starts at since (inclusive)", () => {
    expect(createServiceInput({ since: "2026-02-01", limit: 5 })).toEqual({
      fromDate: "2026-02-01",
      limit: 5,
    });
  });

  it("starts the day after the cursor date", () => {
    expect(
      createServiceInput({ after: "2026-02-28", limit: 31 }).fromDate,
    ).toBe("2026-03-01");
  });

  it("uses the later of since and the day after the cursor date", () => {
    expect(
      createServiceInput({ after: "2026-02-10", since: "2026-02-20", limit: 1 })
        .fromDate,
    ).toBe("2026-02-20");
    expect(
      createServiceInput({ after: "2026-02-25", since: "2026-02-20", limit: 1 })
        .fromDate,
    ).toBe("2026-02-26");
  });
});
