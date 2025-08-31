#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LeetbotAwsStack } from "@/lib/leetbot-aws-stack";

const app = new cdk.App();

const environment = app.node.tryGetContext("deploymentEnvironment") ?? "dev";

new LeetbotAwsStack(app, `${environment}-LeetbotCloud`);
