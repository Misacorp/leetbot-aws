import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { EventScheduler } from "@/lib/constructs/EventScheduler";
import { getRemovalPolicy } from "@/src/util/infra";

interface Props {
  readonly description: string;
  readonly environment: string;
  readonly scheduleExpression: string;
  readonly scheduleExpressionTimezone: string;
  readonly target: sns.ITopic;
  readonly targetInput?: string;
  readonly maximumRetryAttempts?: number;
  readonly maxEventAge?: cdk.Duration;
  readonly deadLetterQueueAlarmDescription?: string;
}

/**
 * EventBridge Scheduler that publishes to an SNS topic.
 */
export class SnsEventScheduler extends Construct {
  public readonly deadLetterQueue?: sqs.Queue;
  public readonly deadLetterQueueAlarm?: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    if (props.deadLetterQueueAlarmDescription) {
      this.deadLetterQueue = new sqs.Queue(this, "ScheduleDlq", {
        removalPolicy: getRemovalPolicy(props.environment),
        retentionPeriod: cdk.Duration.days(14),
      });

      this.deadLetterQueueAlarm = new cloudwatch.Alarm(
        this,
        "ScheduleDlqAlarm",
        {
          metric:
            this.deadLetterQueue.metricApproximateNumberOfMessagesVisible(),
          threshold: 1,
          evaluationPeriods: 1,
          alarmDescription: props.deadLetterQueueAlarmDescription,
        },
      );
    }

    new EventScheduler(this, "Schedule", {
      description: props.description,
      scheduleExpression: props.scheduleExpression,
      scheduleExpressionTimezone: props.scheduleExpressionTimezone,
      targetArn: props.target.topicArn,
      targetAction: "sns:Publish",
      targetInput: props.targetInput,
      maximumRetryAttempts: props.maximumRetryAttempts,
      maxEventAge: props.maxEventAge,
      deadLetterQueue: this.deadLetterQueue,
    });
  }
}
