import * as cdk from "aws-cdk-lib";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export interface EventSchedulerProps {
  readonly description: string;
  readonly scheduleExpression: string;
  readonly scheduleExpressionTimezone: string;
  readonly targetArn: string;
  readonly targetAction: string;
  readonly targetInput?: string;
  readonly maximumRetryAttempts?: number;
  readonly maxEventAge?: cdk.Duration;
  readonly deadLetterQueue?: sqs.IQueue;
}

/**
 * Shared EventBridge Scheduler construct.
 * Creates the scheduler role and schedule resource for a single target.
 */
export class EventScheduler extends Construct {
  constructor(scope: Construct, id: string, props: EventSchedulerProps) {
    super(scope, id);

    const role = new iam.Role(this, "EventSchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    role.attachInlinePolicy(
      new iam.Policy(this, "TargetPolicy", {
        document: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [props.targetAction],
              resources: [props.targetArn],
              effect: iam.Effect.ALLOW,
            }),
          ],
        }),
      }),
    );

    if (props.deadLetterQueue) {
      props.deadLetterQueue.grantSendMessages(role);
    }

    new CfnSchedule(this, "Schedule", {
      flexibleTimeWindow: {
        mode: "OFF",
      },
      scheduleExpression: props.scheduleExpression,
      scheduleExpressionTimezone: props.scheduleExpressionTimezone,
      target: {
        arn: props.targetArn,
        roleArn: role.roleArn,
        input: props.targetInput,
        deadLetterConfig: props.deadLetterQueue
          ? {
              arn: props.deadLetterQueue.queueArn,
            }
          : undefined,
        retryPolicy:
          props.maximumRetryAttempts || props.maxEventAge
            ? {
                maximumRetryAttempts: props.maximumRetryAttempts,
                maximumEventAgeInSeconds: props.maxEventAge?.toSeconds(),
              }
            : undefined,
      },
      description: props.description,
    });
  }
}
