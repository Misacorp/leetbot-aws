import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import createFargateServices from "../bin/createFargateServices";

const createTestStack = (stack: Stack): void => {
  const queue = new sqs.Queue(stack, "LeetbotAwsQueue", {
    visibilityTimeout: Duration.seconds(300),
  });

  const topic = new sns.Topic(stack, "LeetbotAwsTopic");

  topic.addSubscription(new subs.SqsSubscription(queue));

  // eslint-disable-next-line no-new
  new CfnOutput(stack, "SQSQueueUrl", {
    description: "SQS queue URL",
    value: queue.queueUrl,
  });
};

/**
 * Main Cloudformation stack
 */
export class LeetbotAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Test stack temporarily used to see if stuff happens
    createTestStack(this);

    createFargateServices(this);
  }
}
