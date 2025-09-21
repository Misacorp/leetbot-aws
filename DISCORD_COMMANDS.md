# Discord Slash Commands System

This document explains how the Discord slash commands system works in this project.

## System Architecture

The Discord commands system is built on AWS serverless architecture using webhooks rather than a persistent Discord bot connection.

### Registering Commands

Commands need to be registered to Discord so that users know what commands are available and what options they have. See the `scripts/registerCommands` script and run it manually.

### High-Level Flow

A user uses a slash command in Discord, which triggers a webhook and makes a request to the API Gateway of this app. That invokes an ingress Lambda that normalizes the command and puts it on an EventBridge event bus. From there, workers for each command pick up their respective commands and process them accordingly.

Generally, when a slash command is received, this app responds with a "deferred response". It'll show up to the user as a loading indicator. Once the command has been processed, the app edits the original "loading" response with the message's actual content.

### Key Components

- API Gateway
- Ingress Lambda
- EventBridge Event Bus
- Parameter Store; public key
- Worker Lambdas
