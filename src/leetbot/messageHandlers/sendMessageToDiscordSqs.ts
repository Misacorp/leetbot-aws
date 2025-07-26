import type { ScheduledEvent } from "aws-lambda";
import type { MessageHandlerProps, TestEvent } from "../../types";
import { isTestEvent } from "../util/lambda";
import { sendMessage } from "../util/sqs";

/**
 * Sends a message to the Discord SQS queue
 * @param message Discord message
 * @param event   Lambda event
 */
export const sendMessageToDiscordSqs = async (
  message: MessageHandlerProps["message"],
  event: ScheduledEvent | TestEvent,
) => {
  const queueUrl = process.env.QUEUE_URL;
  if (!queueUrl) {
    console.warn(
      "Undefined QUEUE_URL environment variable. Messages will not be sent to SQS.",
    );
    return false;
  }

  // By default, test events will not be sent to SQS. However, test events can override this behavior.
  if (!isTestEvent(event) || event.sendMessageToSqs) {
    const success = await sendMessage({
      MessageBody: JSON.stringify(message),
      QueueUrl: queueUrl,
      MessageDeduplicationId: message.id,
      MessageGroupId: message.author.id,
    });

    // Everything worked
    if (success) {
      return true;
    }
  }

  // React with a warning emoji if SQS sending failed
  await message.react("⚠️");
  return false;
};
