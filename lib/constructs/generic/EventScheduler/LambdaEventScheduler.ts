import type * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { EventScheduler } from "@/lib/constructs/generic/EventScheduler/EventScheduler";

interface Props {
  readonly description: string;
  readonly scheduleExpression: string;
  readonly scheduleExpressionTimezone: string;
  readonly target: lambda.IFunction;
  readonly targetInput?: string;
  readonly maximumRetryAttempts?: number;
  readonly maxEventAge?: import("aws-cdk-lib").Duration;
}

/**
 * EventBridge Scheduler that invokes a Lambda target.
 */
export class LambdaEventScheduler extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    new EventScheduler(this, "Schedule", {
      description: props.description,
      scheduleExpression: props.scheduleExpression,
      scheduleExpressionTimezone: props.scheduleExpressionTimezone,
      targetArn: props.target.functionArn,
      targetAction: "lambda:InvokeFunction",
      targetInput: props.targetInput,
      maximumRetryAttempts: props.maximumRetryAttempts,
      maxEventAge: props.maxEventAge,
    });
  }
}
