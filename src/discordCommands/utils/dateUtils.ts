import { type CommandWindow } from "../core/types";

export function getDateRange(window?: CommandWindow) {
  const endDate = new Date();
  let startDate: Date;

  switch (window) {
    case "this_week":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "this_month":
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "this_year":
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "all_time":
    default:
      // Adjust this baseline as needed
      startDate = new Date(2025, 8, 22, 0, 0, 0, 0);
      break;
  }

  return { startDate, endDate };
}

export function getWindowDisplayText(window?: CommandWindow): string {
  switch (window) {
    case "this_week":
      return "(This Week)";
    case "this_month":
      return "(This Month)";
    case "this_year":
      return "(This Year)";
    case "all_time":
      return "(All Time)";
    default:
      return "(All Time)";
  }
}
