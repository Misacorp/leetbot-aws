import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as destinations from "aws-cdk-lib/aws-lambda-destinations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { getRemovalPolicy } from "@/src/util/infra";

interface Props {
  readonly environment: string;
  readonly topic: sns.ITopic;
  readonly target: lambda.Function;
  readonly retryAttempts?: number;
  readonly queueRetentionPeriod?: cdk.Duration;
  readonly subscriptionDlqAlarmDescription: string;
  readonly lambdaFailureAlarmDescription: string;
}

/**
 * Direct SNS -> Lambda subscription with failure handling on both sides.
 *
 * Creates DLQs for SNS delivery failures Lambda failures.
 * Includes CloudWatch alarms for both queues.
 */
export class SnsLambdaSubscriptionWithFailureHandling extends Construct {
  public readonly subscriptionDlq: sqs.Queue;
  public readonly lambdaDlq: sqs.Queue;
  public readonly subscriptionAlarm: cloudwatch.Alarm;
  public readonly lambdaFailureAlarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const queueRetentionPeriod =
      props.queueRetentionPeriod ?? cdk.Duration.days(14);

    this.subscriptionDlq = new sqs.Queue(this, "SubscriptionDlq", {
      removalPolicy: getRemovalPolicy(props.environment),
      retentionPeriod: queueRetentionPeriod,
    });

    this.subscriptionAlarm = new cloudwatch.Alarm(this, "SnsDlqAlarm", {
      metric: this.subscriptionDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: props.subscriptionDlqAlarmDescription,
    });

    props.topic.addSubscription(
      new subs.LambdaSubscription(props.target, {
        deadLetterQueue: this.subscriptionDlq,
      }),
    );

    this.lambdaDlq = new sqs.Queue(this, "LambdaFailureQueue", {
      removalPolicy: getRemovalPolicy(props.environment),
      retentionPeriod: queueRetentionPeriod,
    });

    this.lambdaFailureAlarm = new cloudwatch.Alarm(this, "LambdaDlqAlarm", {
      metric: this.lambdaDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: props.lambdaFailureAlarmDescription,
    });

    props.target.configureAsyncInvoke({
      onFailure: new destinations.SqsDestination(this.lambdaDlq),
      retryAttempts: props.retryAttempts ?? 2,
    });
  }
}
