import type { ScheduledEvent } from "aws-lambda";
import type { DiscordBotOutPayload, DiscordMessage, TestEvent } from "../types";
import { isTestEvent } from "../util/lambda";
import { publishMessage } from "../util/sns";

interface Props {
  // Discord message
  readonly message: DiscordMessage;
  readonly topicArn: string;
  readonly event?: ScheduledEvent | TestEvent;
}

/**
 * Sends a message to the Discord outgoing SNS topic
 * @param message Discord message
 * @param topicArn SNS topic ARN
 * @param event Event that triggered the Lambda function
 */
export const publishDiscordMessage = async ({
  message,
  topicArn,
  event,
}: Props) => {
  const payload: DiscordBotOutPayload = {
    message,
    event: isTestEvent(event) ? event : null,
  };

  const success = await publishMessage({
    TopicArn: topicArn,
    Message: JSON.stringify(payload),
    MessageDeduplicationId: message.id,
    // Ensure messages from the same author are processed to prevent abuse
    MessageGroupId: message.author.id,
  });

  return Boolean(success);
};
