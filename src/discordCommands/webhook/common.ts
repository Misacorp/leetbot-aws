/**
 * Combines message flags using bitwise OR.
 * Used to join one or more flags into a single bitfield.
 */
export const combineMessageFlags = (
  ...flags: (number | null | undefined)[]
): number | undefined => {
  const validFlags = flags.filter(
    (flag): flag is number => flag !== undefined && flag !== null,
  );

  if (validFlags.length === 0) {
    return undefined;
  }

  return validFlags.reduce((combined, flag) => combined | flag, 0);
};
