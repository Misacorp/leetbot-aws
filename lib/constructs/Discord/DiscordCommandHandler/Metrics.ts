import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  getDefaultLambdaConfig,
  getLogLevel,
  getMinify,
  getRemovalPolicy,
} from "@/src/util/infra";
import { ILambdaLayers } from "@/lib/constructs/Discord/LambdaLayers";

interface Props {
  readonly environment: string;
  readonly layers: ILambdaLayers;
  readonly topic: sns.ITopic;
}

/**
 * Collects metrics from Discord command usage into Cloudwatch.
 */
export class Metrics extends Construct {
  public readonly metricsFunction: NodejsFunction; // Queue for the metrics function
  public readonly metricsQueue: sqs.Queue;
  public readonly dlqAlarm: cloudwatch.Alarm;
  private readonly metricsDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    // Metrics for command usage
    this.metricsFunction = new NodejsFunction(this, "MetricsCollector", {
      ...getDefaultLambdaConfig(),
      entry: "src/discord/interactions/metricsCollector.ts",
      handler: "handler",
      description: "Collects command usage metrics from Discord events.",
      environment: {
        LOG_LEVEL: getLogLevel(props.environment),
      },
      bundling: {
        minify: getMinify(props.environment),
        externalModules: ["@aws-sdk/*", "pino"],
      },
      layers: [props.layers.pinoLayer],
    });

    // Allow publishing metrics
    this.metricsFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      }),
    );

    this.metricsDlq = new sqs.Queue(this, "MetricsDlq", {
      removalPolicy: getRemovalPolicy(props.environment),
      retentionPeriod: cdk.Duration.days(14),
    });

    this.metricsQueue = new sqs.Queue(this, "MetricsQueue", {
      removalPolicy: getRemovalPolicy(props.environment),
      fifo: false,
      retentionPeriod: cdk.Duration.minutes(5),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: this.metricsDlq,
        maxReceiveCount: 5,
      },
    });

    this.dlqAlarm = new cloudwatch.Alarm(this, "MetricsDlqAlarm", {
      metric: this.metricsDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: "Metrics queue DLQ has failed messages.",
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // SNS -> SQS -> Lambda
    props.topic.addSubscription(new subs.SqsSubscription(this.metricsQueue));
    this.metricsFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(this.metricsQueue, {
        batchSize: 10,
      }),
    );
  }
}
