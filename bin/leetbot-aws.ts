#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LeetbotAwsStack } from '../lib/leetbot-aws-stack';

const app = new cdk.App();
new LeetbotAwsStack(app, 'LeetbotAwsStack');
