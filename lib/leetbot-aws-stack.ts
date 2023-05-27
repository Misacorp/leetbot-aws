import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

/**
 * Main Cloudformation stack.
 */
export class LeetbotAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, "LeetbotAwsQueue", {
      visibilityTimeout: Duration.seconds(300),
    });

    const topic = new sns.Topic(this, "LeetbotAwsTopic");

    topic.addSubscription(new subs.SqsSubscription(queue));

    // eslint-disable-next-line no-new
    new CfnOutput(this, "SQSQueueUrl", {
      description: "SQS queue URL",
      value: queue.queueUrl,
    });
  }
}
