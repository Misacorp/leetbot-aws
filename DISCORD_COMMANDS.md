# Discord Slash Commands System

This document explains how the Discord slash commands system works in this project.

## System Architecture

The Discord commands system is built on AWS serverless architecture using webhooks rather than a persistent Discord bot connection.

### Registering Commands

Commands need to be registered to Discord so that users know what commands are available and what options they have. See the `scripts/registerCommands` script and run it manually.

### High-Level Flow

A user uses a slash command in Discord, which triggers a webhook and makes a request to the API Gateway of this app. After verifying the request, the command is sent through SNS and SQS to a different worker Lambda.

Generally, when a slash command is received, this app responds with a "deferred response". It'll show up to the user as a loading indicator. Once the command has been processed, the app edits the original "loading" response with the message's actual content.

### Key Components

- API Gateway
- Ingress Lambda
- SNS
- SQS
- Parameter Store; public key
- Worker Lambda

## Lessons Learned

Lessons learned when developing application interactions.

- An ephemeral response can't later be changed to a non-ephemeral response.
  - The same applies vice-versa.
  - The ingress handler needs to determine if a command should be public or ephemeral.
  - **Workaround:** remove the ephemeral response and send a new message to the channel.
- Discord interaction tokens are valid for 15 minutes.
  - Their length is around 200 characters.
- The `custom_id` property of a Discord interaction component e.g., button has a length limit of 100 characters.
  - A token doesn't fit here.
  - Implemented a memory and DynamoDB-backed cached system to store and fetch tokens between interactions.
