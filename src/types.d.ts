import type { ScheduledEvent } from "aws-lambda";
import type { Message } from "/opt/nodejs/discord";

/**
 * Test event for Discord bot.
 * When adding properties, include them in the `isTestEvent` function (search for it).
 */
export interface TestEvent {
  timeoutOverrideMs?: number;
  alwaysAllowLeet?: boolean;
  alwaysAllowLeeb?: boolean;
  alwaysAllowFailedLeet?: boolean;
  sendMessageToSqs?: boolean;
}

/**
 * Props for functions that handle Discord messages
 */
export interface MessageHandlerProps {
  /**
   * Discord message.
   */
  message: Pick<
    Message,
    "createdTimestamp" | "react" | "guild" | "id" | "author" | "content"
  >,
  /**
   * Event that invoked the Lambda execution.
   * In production, this is a ScheduledEvent originating from EventBridge.
   * When testing manually, this is a TestEvent.
   */
  event: ScheduledEvent | TestEvent
}