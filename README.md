# Leetbot AWS

Leetbot in the cloud. See the [project dashboard](https://github.com/users/Misacorp/projects/1/views/1).

---

<!-- TOC -->

- [Leetbot AWS](#leetbot-aws)
- [Development](#development)
- [Architecture](#architecture)
    - [Lambda Layers](#lambda-layers)
- [Deployment](#deployment)
    - [Deployment Troubleshooting](#deployment-troubleshooting)
        - [No bucket named `xyz`. Is account `123` bootstrapped?](#no-bucket-named-xyz-is-account-123-bootstrapped)
            - [Option 1: CLI](#option-1-cli)
            - [Option 2: AWS Management Console](#option-2-aws-management-console)
    - [Resources](#resources)
- [Scripts](#scripts)
    - [Set Discord Bot Token](#set-discord-bot-token)
    - [Start Discord Bot](#start-discord-bot)
  <!-- TOC -->

# Development

Start by installing dependencies for both the main application and the Discord Lambda layer

```shell
npm install && npm install --prefix src/layers/discord/nodejs
```

The CDK stack itself is located in the `lib` directory.

# Architecture

Leetbot needs to sit in a Discord server every day within the time window `]13:36, 13:39[`. This is accomplished with a
Lambda that keeps itself alive for the duration. An EventBridge scheduled event invokes that Lambda at the same time on
each day and even takes daylight savings into account.

```mermaid
%%{init: {'theme':'dark'}}%%
flowchart TD
    Discord((Discord))
subgraph DiscordBot
EventBridge
BotLambda{{
            discordWatcher
Lambda
}}
SQS
QueueReader{{
createMessage
Lambda
}}
end

EventBridge -- Starts --> BotLambda
Discord -- discord .js --> BotLambda
BotLambda -. Keeps alive .-> BotLambda
BotLambda -- " Sends relevant<br />messages to " --> SQS

subgraph LeetApi
Table[(Table)]
GetUsers{{
getUsers
Lambda
}}
GetServer{{
getServer
Lambda
}}
GetUserMessages{{
getUserMessages
Lambda
}}
API{API Gateway}
end

SQS -- Reads --> QueueReader
QueueReader -- Writes --> Table
Table <--> GetUsers
Table <--> GetServer
Table <--> GetUserMessages
GetUsers <--> API
GetServer <--> API
GetUserMessages <--> API

API <--> Client

classDef discord stroke: #55f, fill: #224, stroke-dasharray: 4px;
classDef dynamo stroke: #a7f,fill: #213;
classDef lambda stroke: #fa0, fill: #320;
classDef sqs stroke:#fda, fill: #430;
class BotLambda,GetUsers, GetServer, GetUserMessages, QueueReader lambda
class Table dynamo
class Discord discord
class SQS sqs
```

## Lambda Layers

The Discord SDK, date-fns,
and possibly other libraries are installed on Lambda layers in `lib/constructs/LambdaLayers.ts`.
For each Lambda function that wants to use, for example,
the Discord API, the Layer should be given in the function definition.

```ts
new NodejsFunction(this, "MyNodejsFunction", {
  layers: [props.layer],
  // ...other NodejsFunction configuration...
});
```

The Discord SDK (or other layers) can then be used in each Lambda handler from `/opt/nodejs/discord`. This is because
Lambda functions mount their layers in the `/opt` directory.

```ts
import discord from "/opt/nodejs/discord";
```

When adding more layers, update `tsconfig.json` with a matching path to that layer.

## DynamoDB Design

The following is a list of database access patterns used by the application.

| Access Pattern                                                                                         | Example Response                           | Index              |
|--------------------------------------------------------------------------------------------------------|--------------------------------------------|--------------------|
| Check if a user has already posted a message of a given type today e.g., no duplicate `leet` messages. | `true`                                     | user-timestamp     |
| Count the sums of all message types for a given guild.                                                 | `{ leet: 300, leeb: 77, failed_leet: 28 }` | guild-*            |
| Count the sums of all message types for a given user.                                                  | `{ leet: 10, leeb: 5, failed_leet: 1 }`    | user-timestamp     |
| Get the user with the most messages of a given type in a given guild e.g., most `leet` messages.       | `{ user: {}, count: 31 }`                  | guild-message-type |
| Count the number of `leet` messages for each user in a given guild.                                    | `[{ user: {}, count: 31 }]`                | guild-message-type |
| Get the users with the fastest messages of a given type e.g., top 10 fastest `leet`.                   | ???                                        | ???                |
| Get the users with the slowest messages of a given type e.g., top 10 slowest `leeb`.                   | ???                                        | ???                |

# Deployment

> If you are using [aws-vault](https://github.com/99designs/aws-vault), prefix pretty much every command here with
`aws-vault exec <your-role-name> -- <command>`

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

> In this article, I'm going to show you how to start/stop EC2 instances. I'll code all the required steps in AWS CDK so
> you can easily integrate it into your existing stack if you're using AWS CDK.

[Fargate Docker Starter](https://github.com/markusl/cdk-fargate-docker-starter)

> This repository shows an example of how to deploy a simple docker image to a Fargate cluster using AWS CDK.

[AWS CDK Lambda Layers](https://bobbyhadz.com/blog/aws-cdk-lambda-layers)

# Scripts

Some scripts are included to help set up and test the application. They are located in the `scripts` folder.

## Set Discord Bot Token

This script sets the AWS Secrets Manager value for the Discord bot's token. Usage:

```shell
./scrips/setBotToken.sh <bot_token> <aws_profile>
```

## Start Discord Bot

This script starts the Discord bot by invoking the Discord Watcher Lambda function. You can supply test event parameters
to, for example, reduce the run time of the Lambda, or allow customized behavior. See the `TestEvent` interface in
`types.d.ts` for all the options.

```shell
./scripts/invokeDiscordWatcher.sh <json_payload> <aws_profile>

# Example:
# ./scripts/invokeDiscordWatcher.sh '{"timeoutOverrideMs": 12000}' sandbox
```
