import { runSequentially } from "./orchestration";

describe("orchestration", () => {
  describe("runSequentially", () => {
    it("should run items in order", async () => {
      const result: number[] = [];

      await runSequentially([1, 2, 3], async (item) => {
        result.push(item);
      });

      expect(result).toEqual([1, 2, 3]);
    });

    it("should wait for each async callback before starting the next one", async () => {
      const activeItems: number[] = [];
      const completedItems: number[] = [];
      let maxConcurrency = 0;

      await runSequentially([1, 2, 3], async (item) => {
        activeItems.push(item);
        maxConcurrency = Math.max(maxConcurrency, activeItems.length);

        await new Promise((resolve) => setTimeout(resolve, 5));

        activeItems.splice(activeItems.indexOf(item), 1);
        completedItems.push(item);
      });

      expect(maxConcurrency).toBe(1);
      expect(completedItems).toEqual([1, 2, 3]);
    });

    it("should stop when a callback throws", async () => {
      const result: number[] = [];

      await expect(
        runSequentially([1, 2, 3], async (item) => {
          result.push(item);

          if (item === 2) {
            throw new Error("boom");
          }
        }),
      ).rejects.toThrow("boom");

      expect(result).toEqual([1, 2]);
    });
  });
});
