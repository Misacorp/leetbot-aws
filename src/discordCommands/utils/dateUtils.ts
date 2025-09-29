import { CommandWindow } from "@/src/discordCommands/core/common";

export function getDateRange(window?: CommandWindow) {
  const now = new Date();

  // Set the end date to the very last millisecond of today
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (window) {
    case "this_week":
      // Get the first day of the current week (Monday) at midnight
      startDate = new Date(now);
      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
      startDate.setDate(startDate.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "this_year":
      // Start from the beginning of this year (January 1st) at midnight
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    case "all_time":
      // Start from Unix epoch (January 1, 1970) at midnight
      startDate = new Date(0);
      break;

    case "this_season":
    default:
      // Start from the first day of the current month at midnight
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

export function getWindowDisplayText(window?: CommandWindow): string {
  switch (window) {
    case "this_week":
      return "this week";
    case "this_year":
      return "this year";
    case "all_time":
      return "all time";
    case "this_season":
    default:
      return "this season";
  }
}
