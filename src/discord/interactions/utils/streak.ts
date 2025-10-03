import type { Message } from "@/src/repository/message/types";
import { getDatePrefix, setTimeToLeet } from "@/src/util/dateTime";
import { createDateString } from "@/src/discord/discordUtils";

/**
 * Extracts unique message dates in YYYY-MM-DD format from messages
 * @param messages List of messages with createdAt timestamps
 * @returns Sorted array of unique date strings
 */
const getUniqueSortedDates = (
  messages: Pick<Message, "createdAt">[],
): string[] => {
  const uniqueDates = Array.from(
    new Set(messages.map((message) => getDatePrefix(message.createdAt))),
  );
  return uniqueDates.sort();
};

/**
 * Checks if two date strings represent consecutive days
 * @param first First date string in YYYY-MM-DD format
 * @param second Second date string in YYYY-MM-DD format
 * @returns True if dates are exactly one day apart
 */
const areConsecutiveDays = (first: string, second: string): boolean => {
  const date1 = new Date(first);
  const date2 = new Date(second);
  const timeDiff = date2.getTime() - date1.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  return daysDiff === 1;
};

/**
 * Finds the longest consecutive streak in a sorted array of date strings
 * @param sortedDates Array of date strings sorted chronologically
 * @returns Streak length, start date, and end date
 */
const findLongestConsecutiveStreak = (sortedDates: string[]): StreakInfo => {
  if (sortedDates.length === 0) {
    return { length: 0, startDate: null, endDate: null };
  }

  let maxStreak = 1;
  let currentStreak = 1;
  let currentStreakStart = 0;
  let maxStreakStart = 0;
  let maxStreakEnd = 0;

  for (let i = 1; i < sortedDates.length; i++) {
    if (areConsecutiveDays(sortedDates[i - 1], sortedDates[i])) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakStart = currentStreakStart;
        maxStreakEnd = i;
      }
    } else {
      currentStreak = 1;
      currentStreakStart = i;
    }
  }

  return {
    length: maxStreak,
    startDate: setTimeToLeet(sortedDates[maxStreakStart]),
    endDate: setTimeToLeet(sortedDates[maxStreakEnd]),
  };
};

/**
 * Calculates the longest consecutive day streak from a list of messages
 * @param messages List of messages with createdAt timestamps
 * @returns StreakInfo containing length, start date, and end date
 */
export const calculateLongestStreak = (
  messages: Pick<Message, "createdAt">[],
): StreakInfo => {
  if (messages.length === 0) {
    return { length: 0, startDate: null, endDate: null };
  }

  const uniqueSortedDates = getUniqueSortedDates(messages);
  return findLongestConsecutiveStreak(uniqueSortedDates);
};

/**
 * Formats a Discord message describing a message streak
 * @param streak Information about the streak
 */
export const formatStreakMessage = (streak: StreakInfo): string => {
  if (streak.startDate && streak.endDate && streak.length > 1) {
    const startDate = streak.startDate;
    const endDate = streak.endDate;
    const today = new Date();

    if (today.toDateString() === endDate.toDateString()) {
      return `${streak.length} days ongoing from ${createDateString(startDate, "D")}!`;
    }

    return `${streak.length} days from ${createDateString(startDate, "D")} to ${createDateString(endDate, "D")}.`;
  }

  return "No streaks to speak of.";
};
