import logger from "@logger";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { Client } from "/opt/nodejs/discord";
import type { DiscordReactionCommand } from "@/src/types";

export class SQSPoller {
  private sqsClient: SQSClient;
  private isPolling = false;

  constructor() {
    this.sqsClient = new SQSClient({});
  }

  /**
   * Start polling SQS queue for reaction instructions
   * @param discordClient Discord client
   */
  public startPolling(discordClient: Client): void {
    this.isPolling = true;
    void this.pollSQSForReactions(discordClient);
  }

  /**
   * Stop polling SQS queue
   */
  public stopPolling(): void {
    this.isPolling = false;
  }

  /**
   * Poll SQS queue for reaction instructions
   * @param discordClient Discord client
   */
  private async pollSQSForReactions(discordClient: Client): Promise<void> {
    while (this.isPolling) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 1,
          VisibilityTimeout: 30,
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages) {
          await Promise.all(
            response.Messages.map(async (message) => {
              if (message.Body && message.ReceiptHandle) {
                await this.processReactCommand(
                  discordClient,
                  message.Body,
                  message.ReceiptHandle,
                );
              }
            }),
          );
        }
      } catch (error) {
        logger.error({ error }, "Error polling SQS for reactions");
        // Wait a bit before retrying to avoid tight loop on persistent errors
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process a single reaction command from SQS
   * @param discordClient Discord client
   * @param messageBody SQS message body
   * @param receiptHandle SQS message receipt handle
   */
  private async processReactCommand(
    discordClient: Client,
    messageBody: string,
    receiptHandle: string,
  ): Promise<void> {
    try {
      const instruction: DiscordReactionCommand = JSON.parse(messageBody);

      if (!instruction.messageId || !instruction.emoji) {
        logger.warn(
          { instruction },
          "Invalid reaction instruction - missing messageId or emoji",
        );
        return;
      }

      // Find the message across all channels the bot has access to
      let targetMessage = null;

      // If channel ID is provided, look in that specific channel
      const channel = await discordClient.channels.fetch(instruction.channelId);
      if (!channel) {
        logger.error(
          `Could not find channel with channelId ${instruction.channelId}`,
        );
        return;
      }

      if (!channel.isTextBased()) {
        logger.error(`Channel ${channel.name} is not text based.`);
        return;
      }

      targetMessage = await channel.messages.fetch(instruction.messageId);

      if (targetMessage) {
        await targetMessage.react(instruction.emoji);
        logger.debug(
          `Successfully added reaction ${instruction.emoji} to message ${instruction.messageId}`,
        );
      } else {
        logger.warn(`Message ${instruction.messageId} not found`);
      }

      // Delete the message from SQS after processing
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (error) {
      logger.error({ error }, "Error processing reaction instruction:");
      // Don't delete the message from SQS if processing failed
      // It will become visible again after the visibility timeout
    }
  }
}
