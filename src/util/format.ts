/**
 * Make the first character of a string capitalized
 */
export const capitalize = (input: string): string =>
  input.charAt(0).toUpperCase() + input.slice(1);
