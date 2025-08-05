#!/bin/bash

# Check that both a secret value and AWS profile are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <new_secret_value> <aws_profile>"
  exit 1
fi

new_secret_value=$1
aws_profile=$2

# Read the secret ARN from cdk-outputs.json
arn=$(jq -r '.LeetbotAwsStack | to_entries[] | select(.key | startswith("DiscordBotDiscordBotTokenArn")) | .value' cdk-outputs.json)

# Update the secret value using the specified AWS profile
aws-vault exec $aws_profile -- aws secretsmanager update-secret --secret-id "$arn" --secret-string "$new_secret_value"