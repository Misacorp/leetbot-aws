import logger from "@logger";
import { type APIChatInputApplicationCommandInteraction } from "discord-api-types/v10";
import { getDateRange, getWindowDisplayText } from "../../utils/dateUtils";
import { type MessageType, MessageTypes } from "@/src/types";
import type { Message } from "@/src/repository/message/types";
import { normalizeChatInput } from "@/src/discord/interactions/core/schemaParser";
import { UserInfoCommand, UserInfoCommandSchema } from "./schema";
import { updateOriginalResponse } from "@/src/discord/interactions/webhook/updateOriginalResponse";
import { getGuildById } from "@/src/repository/guild/getGuildById";
import { capitalize } from "@/src/util/format";
import { getUserMessagesByDateRange } from "@/src/repository/message/getUserMessagesByDateRange";
import { getGuildUserById } from "@/src/repository/user/getGuildUserById";
import {
  ensureGuildId,
  ensureTableName,
} from "@/src/discord/interactions/utils/validateInteractions";
import {
  createDateString,
  getEmojiStrings,
  getGameEmojis,
} from "@/src/discord/discordUtils";
import { getDatePrefix, setZonedTime, toDateObject } from "@/src/util/dateTime";

/**
 * Handles the Discord interaction (slash command) to get user info
 */
export async function handleUserInfoCommand(
  interaction: APIChatInputApplicationCommandInteraction,
): Promise<void> {
  const tableName = await ensureTableName(interaction);
  if (!tableName) {
    return;
  }
  const guildId = await ensureGuildId(interaction);
  if (!guildId) {
    return;
  }

  const data: UserInfoCommand = normalizeChatInput(
    interaction,
    UserInfoCommandSchema,
  );

  // `username` is the user-facing option name, but it receives the user id as a value
  const userId = data.options.username;
  // `when` is the user-facing option name
  const window = data.options.when;

  logger.debug(
    {
      username: userId,
      window: window,
    },
    "Processing user info command",
  );

  const { startDate, endDate } = getDateRange(window);
  const windowText = getWindowDisplayText(window);

  // Get all the data we need
  const [user, guild, userMessages] = await Promise.all([
    getGuildUserById({
      tableName,
      userId,
      guildId,
    }),
    getGuildById({
      tableName,
      id: guildId,
    }),
    getUserMessagesByDateRange({
      tableName,
      userId,
      guildId,
      startDate,
      endDate,
    }),
  ]);

  if (!user) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content: `Who? I don't know anyone with that name. Tell them to leet more.`,
      },
    });

    return;
  }

  if (!userMessages || userMessages.length === 0) {
    await updateOriginalResponse({
      interaction,
      payload: {
        content: `Couldn't find any messages for that user 🥲`,
      },
    });

    return;
  }

  // Sort all the user's messages by type
  const messagesByType: Map<MessageType, Message[]> = new Map();
  userMessages.forEach((message) => {
    messagesByType.set(message.messageType, [
      ...(messagesByType.get(message.messageType) ?? []),
      message,
    ]);
  });

  // Get the fastest LEET message (closest to 13:37:00.0000)
  let fastestMessages: Message[] = [userMessages[0]];
  let fastestMessageMs: number = new Date(
    userMessages[0].createdAt,
  ).getMilliseconds();

  // Start from the 2nd message onward (works even if there's just one message)
  userMessages.slice(1).forEach((message) => {
    const ms = new Date(message.createdAt).getMilliseconds();
    if (ms < fastestMessageMs) {
      fastestMessages = [message];
      fastestMessageMs = ms;
      return;
    }

    // Handle same-millisecond messages
    if (ms === fastestMessageMs) {
      fastestMessages.push(message);
    }
  });

  /**
   * Information about a consecutive day streak
   */
  interface StreakInfo {
    length: number;
    startDate: Date | null;
    endDate: Date | null;
  }

  /**
   * Extracts unique message dates in YYYY-MM-DD format from messages
   * @param messages List of messages with createdAt timestamps
   * @returns Sorted array of unique date strings
   */
  const getUniqueSortedDates = (messages: Message[]): string[] => {
    const uniqueDates = Array.from(
      new Set(messages.map((message) => getDatePrefix(message.createdAt))),
    );
    return uniqueDates.sort();
  };

  /**
   * Checks if two date strings represent consecutive days
   * @param dateStr1 First date string in YYYY-MM-DD format
   * @param dateStr2 Second date string in YYYY-MM-DD format
   * @returns True if dates are exactly one day apart
   */
  const areConsecutiveDays = (dateStr1: string, dateStr2: string): boolean => {
    const date1 = new Date(dateStr1);
    const date2 = new Date(dateStr2);
    const timeDiff = date2.getTime() - date1.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    return daysDiff === 1;
  };

  const setTimeToLeet = (originalDate: string): Date => {
    const date = toDateObject(originalDate);
    return setZonedTime(originalDate, undefined, {
      hours: 13,
      minutes: 13,
      seconds: date.getSeconds(),
      ms: date.getMilliseconds(),
    });
  };

  /**
   * Finds the longest consecutive streak in a sorted array of date strings
   * @param sortedDates Array of date strings sorted chronologically
   * @returns StreakInfo containing length, start date, and end date
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
  const calculateLongestStreak = (messages: Message[]): StreakInfo => {
    if (messages.length === 0) {
      return { length: 0, startDate: null, endDate: null };
    }

    const uniqueSortedDates = getUniqueSortedDates(messages);
    return findLongestConsecutiveStreak(uniqueSortedDates);
  };

  const longestStreak = calculateLongestStreak(
    messagesByType.get(MessageTypes.LEET) ?? [],
  );

  // Emoji string representations
  const { leetEmoji, leebEmoji, failedLeetEmoji } = getGameEmojis(guild);
  const [
    leetEmojiString = "LEET",
    leebEmojiString = "LEEB",
    failedLeetEmojiString = "FAILED_LEET",
  ] = getEmojiStrings([leetEmoji, leebEmoji, failedLeetEmoji]);

  const getLongestStreakString = (longestStreak: StreakInfo): string => {
    if (
      longestStreak.startDate &&
      longestStreak.endDate &&
      longestStreak.length > 1
    ) {
      const startDate = longestStreak.startDate;
      const endDate = longestStreak.endDate;
      const today = new Date();

      if (today.toDateString() === endDate.toDateString()) {
        return `${longestStreak.length} days ongoing from ${createDateString(startDate, "D")}!`;
      }

      return `${longestStreak.length} days from ${createDateString(startDate, "D")} to ${createDateString(endDate, "D")}`;
    }

    return "No streaks to speak of.";
  };

  await updateOriginalResponse({
    interaction,
    payload: {
      embeds: [
        {
          title: `Stats for ${windowText}`,
          description: `${capitalize(windowText)} started ${createDateString(startDate, "R")}.`,
          timestamp: new Date().toISOString(),
          author: {
            name: user.displayName ?? user.username,
            icon_url: user.avatarUrl ?? undefined,
          },
          color: 10181046,
          thumbnail: user.avatarUrl
            ? {
                url: user.avatarUrl,
              }
            : undefined,

          image: user?.bannerUrl
            ? {
                url: user.bannerUrl,
              }
            : undefined,
          footer: guild
            ? {
                text: guild.name,
                icon_url: guild.iconUrl ?? undefined,
              }
            : undefined,
          fields: [
            {
              name: leetEmojiString,
              value:
                messagesByType.get(MessageTypes.LEET)?.length.toString() ?? "-",
              inline: true,
            },
            {
              name: leebEmojiString,
              value:
                messagesByType.get(MessageTypes.LEEB)?.length.toString() ?? "-",
              inline: true,
            },
            {
              name: failedLeetEmojiString,
              value:
                messagesByType
                  .get(MessageTypes.FAILED_LEET)
                  ?.length.toString() ?? "-",
              inline: true,
            },
            {
              name: `Longest ${leetEmojiString} streak`,
              value: getLongestStreakString(longestStreak),
            },
            {
              name: `Fastest ${leetEmojiString}`,
              value: `${fastestMessageMs} ms on ${fastestMessages
                .map((msg) => createDateString(new Date(msg.createdAt), "D"))
                .join(" and ")}.`,
            },
          ],
        },
      ],
    },
  });
}
