# Leetbot AWS

Leetbot in the cloud.

<!-- TOC -->

- [Leetbot AWS](#leetbot-aws)
- [Architecture](#architecture)
- [Development](#development)
- [Deployment](#deployment)
  - [Deployment Troubleshooting](#deployment-troubleshooting)
    - [No bucket named `xyz`. Is account `123` bootstrapped?](#no-bucket-named-xyz-is-account-123-bootstrapped)
      - [Option 1: CLI](#option-1-cli)
      - [Option 2: AWS Management Console](#option-2-aws-management-console)
  - [Resources](#resources)
  <!-- TOC -->

# Architecture

Leetbot needs to sit in a Discord server every day within the time window `]13:36, 13:39[`. This could be accomplished in a few different ways including

1. Running an EC2 instance for those 3 minutes.
2. ✅ Running a Lambda for those 3 minutes. (Current implementation)
3. Starting a Fargate container for those 3 minutes.

## Lambda Layers

The Discord SDK is installed on a Lambda Layer in `lib/constructs/DiscordSdkLambdaLayer.ts`. For each Lambda function that wants to use the Discord API, the Layer should be given in the function definition.

```ts
new NodejsFunction(this, "MyNodejsFunction", {
  layers: [
    lambda.LayerVersion.fromLayerVersionArn(
      this,
      "ImportedDiscordSdkLambdaLayer",
      props.layer.layer.layerVersionArn,
    ),
  ],
  // ...other NodejsFunction configuration...
});
```

The Discord SDK can then be used in each Lambda handler from `/opt/nodejs/discordSdkLayer`. This is because Lambda functions mount their layers in the `/opt` directory.

```ts
import { discordSdkLayer } from "/opt/nodejs/discordSdkLayer";
```

# Development

The stack itself is located in the `lib` directory.

# Deployment

> If you are using [aws-vault](https://github.com/99designs/aws-vault), prefix pretty much every command here with `aws-vault exec <your-role-name> -- <command>`

Run `npm run aws:deploy` to deploy the application.

Each `CfnOutput` will be saved to a `cdk-outputs.json` file, should you need to reference them.

## Deployment Troubleshooting

### No bucket named `xyz`. Is account `123` bootstrapped?

Fix this by doing one of the following:

#### Option 1: CLI

Run this script: `npm run aws:unbootstrap`

#### Option 2: AWS Management Console

1. Log in to the AWS Management Console and navigate to Cloudformation.
2. Delete the `CDKToolkit` stack.
3. Run `npx cdk bootstrap`.

Finally, re-bootstrap the environment with `npm run aws:bootstrap`. Deployment should work now.

## Resources

[EventBridge Scheduler to start and stop EC2 instances](https://serverlessland.com/patterns/eventbridge-schedule-to-ec2-cdk)

> Simple pattern that starts and stops given EC2 instances based on time of day, timezone and days of week

[How to start/stop AWS EC2 instances automatically](https://purple.telstra.com/blog/start-stop-aws-ec2-instances-automatically)

> In this article, I'm going to show you how to start/stop EC2 instances. I'll code all the required steps in AWS CDK so you can easily integrate it into your existing stack if you're using AWS CDK.

[Fargate Docker Starter](https://github.com/markusl/cdk-fargate-docker-starter)

> This repository shows an example of how to deploy a simple docker image to a Fargate cluster using AWS CDK.
