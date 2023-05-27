#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { LeetbotAwsStack } from "../lib/leetbot-aws-stack";

const app = new cdk.App();

/**
 * ESLint rule disable reason:
 * A common pattern in CDK is creating stacks as side effects.
 * While this is normally discouraged with the `no-new` rule, the practice is standard in this context.
 */
new LeetbotAwsStack(app, "LeetbotAwsStack"); // eslint-disable-line no-new
