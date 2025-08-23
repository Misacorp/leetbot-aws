import type { ScheduledEvent } from "aws-lambda";
import type { GuildMember, Message } from "/opt/nodejs/discord";

/**
 * Test event for Discord bot.
 * When adding properties, include them in the `isTestEvent` function.
 * @see isTestEvent
 */
export interface TestEvent {
  timeoutOverrideMs?: number;
  alwaysAllowLeet?: boolean;
  alwaysAllowLeeb?: boolean;
  alwaysAllowFailedLeet?: boolean;
}

/**
 * Incoming Discord message.
 * Extended to match what is actually received. The Discord.js types don't reflect this.
 */
export type PartialDiscordMessage = Message & { authorId: string };

/**
 * Relevant properties of a Discord message.
 */
export type MessageSummary = Pick<
  Message,
  "createdTimestamp" | "guild" | "id" | "content" | "channelId"
>;

/**
 * Relevant properties of the message author type.
 */
export type AuthorSummary = Pick<
  Message["author"],
  "id" | "username" | "discriminator" | "avatar"
> & {
  avatarUrl: string | null;
};

/**
 * Relevant and interesting properties of the `GuildMember` type.
 */
export type GuildMemberSummary = Pick<GuildMember, "displayName"> & {
  avatarUrl: string;
};

/**
 * Discord message, with relevant properties picked.
 */
export type DiscordMessage = MessageSummary & {
  author: AuthorSummary;
  member: GuildMemberSummary | undefined;
};

export interface DiscordBotOutPayload {
  message: DiscordMessage;
  event: null | TestEvent;
}

/**
 * Props for functions that handle Discord messages
 * @deprecated
 */
export interface MessageHandlerProps {
  readonly message: DiscordMessage;
  /**
   * Event that invoked the Lambda execution.
   * In production, this is a ScheduledEvent originating from EventBridge.
   * When testing manually, this is a TestEvent.
   */
  readonly event: ScheduledEvent | TestEvent;
}

export const MessageTypes = {
  LEET: "leet",
  LEEB: "leeb",
  FAILED_LEET: "failed_leet",
  OTHER: "other",
  TEST: "test",
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];
