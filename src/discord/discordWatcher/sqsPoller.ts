import logger from "@logger";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { SNSMessage } from "aws-lambda";
import type { Client } from "/opt/nodejs/discord";
import type { DiscordReactionCommand } from "@/src/types";

export class SQSPoller {
  private sqsClient: SQSClient;
  private isPolling = false;
  private readonly queueUrl: string;
  private readonly discordClient: Client;

  constructor(queueUrl: string, client: Client) {
    this.queueUrl = queueUrl;
    this.discordClient = client;
    this.sqsClient = new SQSClient({});
  }

  /**
   * Start polling SQS queue for reaction instructions
   */
  public startPolling(): void {
    this.isPolling = true;
    void this.pollSQSForReactions(this.queueUrl, this.discordClient);
  }

  /**
   * Stop polling SQS queue
   */
  public stopPolling(): void {
    this.isPolling = false;
  }

  /**
   * Poll SQS queue for reaction instructions
   * @param queueUrl SQS queue url to poll from
   * @param discordClient Discord client
   */
  private async pollSQSForReactions(
    queueUrl: string,
    discordClient: Client,
  ): Promise<void> {
    while (this.isPolling) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 1,
          VisibilityTimeout: 30,
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages) {
          await Promise.allSettled(
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
   * @param messageBody SQS message body (SNS message wrapper)
   * @param receiptHandle SQS message receipt handle
   */
  private async processReactCommand(
    discordClient: Client,
    messageBody: string,
    receiptHandle: string,
  ): Promise<void> {
    try {
      // Parse the SNS message wrapper
      const snsMessage: SNSMessage = JSON.parse(messageBody);

      if (!snsMessage.Message) {
        logger.warn(
          { snsMessage },
          "Invalid SNS message - missing Message field",
        );
        return;
      }

      // Parse the actual DiscordReactionCommand from the SNS Message field
      const instruction: DiscordReactionCommand = JSON.parse(
        snsMessage.Message,
      );

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
          QueueUrl: this.queueUrl,
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
