export const runSequentially = async <T>(
  items: T[],
  fn: (item: T) => Promise<void>,
) => {
  await items.reduce(async (previous, item) => {
    await previous;
    await fn(item);
  }, Promise.resolve());
};
