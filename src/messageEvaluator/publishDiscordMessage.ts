import type { ScheduledEvent } from "aws-lambda";
import type { MessageHandlerProps, TestEvent } from "../types";
import { isTestEvent } from "../util/lambda";
import { publishMessage } from "../util/sns";

interface Props {
  // Discord message
  readonly message: MessageHandlerProps["message"];
  readonly topicArn: string;
  readonly event?: ScheduledEvent | TestEvent;
}

/**
 * Sends a message to the Discord outgoing SNS topic
 * @param message Discord message
 * @param topicArn
 * @param event   Lambda event
 */
export const publishDiscordMessage = async ({
  message,
  topicArn,
  event,
}: Props) => {
  // By default, test events will not be processed. However, test events can override this behavior.
  if (!event || !isTestEvent(event) || event.processMessage) {
    const success = await publishMessage({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      MessageDeduplicationId: message.id,
      // Ensure messages from the same author are processed to prevent abuse
      MessageGroupId: message.author.id,
    });

    if (success) {
      return true;
    }
  }

  return false;
};
