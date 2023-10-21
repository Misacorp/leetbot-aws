import type { Context, ScheduledEvent } from "aws-lambda";
import type { TestEvent } from "../../types";

// How long to leave for the function to log out of Discord and exit
const EXIT_THRESHOLD = 4000;

/**
 * Keeps a Lambda function alive by maintaining entities in the Javascript call stack and event queue.
 * @param event   Lambda event
 * @param context Lambda execution context
 */
const keepAlive = async (
  event: ScheduledEvent | TestEvent,
  context: Context,
) => {
  // Allow overriding the time this function runs for.
  // Useful when testing Lambdas with manual invocation.
  const timeoutOverrideMs =
    "timeoutOverrideMs" in event ? event.timeoutOverrideMs : undefined;

  const timeRemaining = timeoutOverrideMs ?? context.getRemainingTimeInMillis();

  await new Promise((resolve) => {
    setTimeout(resolve, timeRemaining - EXIT_THRESHOLD);
  });
};

export default keepAlive;

/**
 * Determines if the event argument of a Lambda function was a test event.
 * @param event Event
 */
export const isTestEvent = (event: any): event is TestEvent =>
  event.timeoutOverrideMs !== undefined ||
  event.alwaysAllowLeet !== undefined ||
  event.alwaysAllowLeeb !== undefined ||
  event.alwaysAllowFailedLeet !== undefined ||
  event.sendMessageToSqs !== undefined;
