# AGENTS.md

## What this project is

`leetbot-aws` is a serverless Discord bot on AWS.

Domain, at high level:

- It watches Discord messages around the daily "leet window" in Helsinki time.
- It classifies messages into game outcomes like `leet`, `leeb`, and `failed_leet`.
- It stores guild, user, and message data in DynamoDB.
- It exposes Discord slash commands for rankings and per-user stats.

This is not a generic Discord app. Most code exists to support one specific game/workflow around timed messages and statistics.

## AI agent instructions

Maintain repo-specific instructions for AI agents here.

- When running TypeScript builds for validation, prefer `tsc --noEmit` over emitting build output unless emitting files is explicitly required.
- See the agent-instructions library in [docs/agent-instructions/README.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/README.md).
- Validation guidance: [validation.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/validation.md)
- Testing guidance: [testing.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/testing.md)
- Naming guidance: [naming.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/naming.md)
- Refactoring guidance: [refactoring.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/refactoring.md)
- Documentation guidance: [documentation.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/documentation.md)
- Commit guidance: [commits.md](/Users/misjok/Projects/Misacorp/leetbot-aws/docs/agent-instructions/commits.md)

## Runtime shape

There are 2 main runtime paths:

1. Scheduled watcher flow
   - EventBridge Scheduler starts the `discordWatcher` Lambda daily.
   - That Lambda logs into Discord, watches messages for a short window, and publishes relevant events.
   - Messages move through SNS/SQS to `messageEvaluator`.
   - `messageEvaluator` decides whether a message is `leet`, `leeb`, `failed_leet`, etc, writes data, and can send reaction commands back toward the watcher path.

2. Slash command flow
   - Discord sends interaction webhooks to API Gateway.
   - `ingress` verifies Discord signatures and acknowledges quickly.
   - Interactions are fanned out through SNS/SQS to `slashCommandWorker`.
   - The worker handles commands like `ranking` and `user`, then edits or posts Discord responses.

## Repo structure

### Infrastructure

- `bin/leetbot-aws.ts`
  - CDK app entrypoint.
- `lib/`
  - AWS CDK stack and constructs.
  - `leetbot-aws-stack.ts` wires the whole system together.
  - `constructs/Discord/DiscordBot/` defines the scheduled watcher + evaluator pipeline.
  - `constructs/Discord/DiscordCommandHandler/` defines the interactions API + worker pipeline.
  - `constructs/Table.ts` is the main DynamoDB table.
  - `constructs/CacheTable.ts` is a small TTL cache table, mainly for interaction follow-up state.
  - `constructs/EventScheduler.ts` defines the daily Helsinki-time schedule.
  - `constructs/Discord/LambdaLayers.ts` packages shared Lambda dependencies as layers.

### Application code

- `src/discord/discordWatcher/`
  - Long-lived Lambda session that connects to Discord during the game window.
- `src/discord/messageEvaluator/`
  - Classifies messages and applies game logic.
- `src/discord/interactions/`
  - Slash command ingress, routing, handlers, webhook response helpers, component handlers.
  - Current command surface is small and schema-driven.
- `src/repository/`
  - DynamoDB read/write helpers and item type definitions.
  - `types.ts` files are important: they document key shapes and access patterns.
- `src/util/`
  - Shared AWS, logging, formatting, date/time, cache, and secret helpers.
- `src/types.ts`
  - Shared app-level message/test-event types.

### Lambda layers

- `src/layers/`
  - Local source for Lambda layers like Discord SDK, `date-fns`, `pino`, and `tweetnacl`.
  - `tsconfig.json` maps `/opt/nodejs/...` imports back to these local files for development/testing.

### Scripts and docs

- `scripts/`
  - Operational helpers: register commands, invoke watcher, install layers, set secrets, clean tables, migration tooling.
- `README.md`
  - Best starting point for local setup, architecture, and deploy commands.
- `DISCORD_COMMANDS.md`
  - Notes about the slash-command/webhook architecture and Discord-specific constraints.

### Tests

- Tests are light and mostly live beside source files or under `test/`.
- `jest.config.ts` is the main test config.

## Data model, conceptually

Main persisted entities:

- Guild metadata
- Guild users/members
- Classified game messages
- Short-lived cached interaction state

The main DynamoDB table is single-table style:

- Primary keys support guild metadata and rankings queries.
- GSIs support per-user lookups and speed/ranking style queries.
- Read the repository `types.ts` files before changing key design.

## How to navigate changes

- If changing AWS resources or event wiring, start in `lib/`.
- If changing game behavior, start in `src/discord/messageEvaluator/`.
- If changing the Discord live watcher, start in `src/discord/discordWatcher/`.
- If changing slash commands or interaction UX, start in `src/discord/interactions/`.
- If changing persistence or query behavior, start in `src/repository/`.
- If changing shared dependencies available to Lambdas, check `src/layers/` and `lib/constructs/Discord/LambdaLayers.ts`.

## Operational assumptions

- Deployments are CDK-based.
- The repo distinguishes at least `dev` and `prd`.
- Discord secrets/public keys are stored in AWS Secrets Manager / SSM Parameter Store.
- The scheduled game window is tied to Helsinki time, not UTC.
