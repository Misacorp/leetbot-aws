import type { ScheduledEvent } from "aws-lambda";
import type { MessageHandlerProps, TestEvent } from "../../types";
import { isTestEvent } from "../util/lambda";
import { publishMessage } from "../util/sns";

/**
 * Sends a message to the Discord outgoing SNS topic
 * @param message Discord message
 * @param event   Lambda event
 */
export const publishToDiscordOutTopic = async (
  message: MessageHandlerProps["message"],
  event: ScheduledEvent | TestEvent,
) => {
  const topicArn = process.env.TOPIC_ARN;
  if (!topicArn) {
    console.warn(
      "Undefined TOPIC_ARN environment variable. Messages will not be sent to SNS.",
    );
    return false;
  }

  // By default, test events will not be processed. However, test events can override this behavior.
  if (!isTestEvent(event) || event.processMessage) {
    const success = await publishMessage({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      MessageDeduplicationId: message.id,
      // Ensure messages from the same author are processed to prevent abuse
      MessageGroupId: message.author.id,
    });

    // Everything worked
    if (success) {
      return true;
    }
  }

  // React with a warning emoji if SNS publish failed
  await message.react("⚠️");
  return false;
};
