import { Construct } from "constructs";
import { CfnSchedule } from "aws-cdk-lib/aws-scheduler";
import * as iam from "aws-cdk-lib/aws-iam";
import type { IFunction } from "aws-cdk-lib/aws-lambda";

interface Props {
  readonly target: IFunction;
  readonly scheduleExpression: string;
  readonly scheduleExpressionTimezone: string;
}

/**
 * Schedules a CloudWatch event that runs the target Lambda function.
 */
export class EventScheduler extends Construct {
  private readonly role: iam.Role;

  private readonly schedule: CfnSchedule;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Role for the event scheduler
    this.role = new iam.Role(this, "EventSchedulerRole", {
      assumedBy: new iam.ServicePrincipal("scheduler.amazonaws.com"),
    });

    // Create a policy that allows invoking the target Lambda function
    const invokeLambdaPolicy = new iam.Policy(this, "InvokeLambdaPolicy", {
      document: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            actions: ["lambda:InvokeFunction"],
            resources: [props.target.functionArn],
            effect: iam.Effect.ALLOW,
          }),
        ],
      }),
    });

    // Attach the policy to the role
    this.role.attachInlinePolicy(invokeLambdaPolicy);

    // Define the schedule we want
    this.schedule = new CfnSchedule(this, "EventScheduler", {
      flexibleTimeWindow: {
        mode: "OFF",
      },
      scheduleExpression: props.scheduleExpression,
      scheduleExpressionTimezone: props.scheduleExpressionTimezone,
      target: {
        arn: props.target.functionArn,
        roleArn: this.role.roleArn,
      },
      description:
        "CloudWatch event rule scheduled for 13:36.000 each day in Finnish time",
    });
  }
}
