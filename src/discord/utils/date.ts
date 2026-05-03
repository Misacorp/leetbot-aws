/**
 * Timestamp display modes supported by Discord.
 * @see https://sesh.fyi/timestamp/
 */
type DateRepresentationMode = "F" | "f" | "D" | "d" | "T" | "t" | "R";

/**
 * Creates a Discord timestamp expression.
 */
export const createDateString = (
  date: Date,
  mode: DateRepresentationMode = "D",
) => `<t:${Math.floor(date.getTime() / 1000)}:${mode}>`;
