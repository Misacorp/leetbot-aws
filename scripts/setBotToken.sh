#!/bin/bash

# Check that secret value, AWS profile, and environment are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <new_secret_value> <aws_profile> <environment>"
  echo "Example: $0 'your-token' leetbot-dev dev"
  exit 1
fi

new_secret_value=$1
aws_profile=$2
environment=$3

# Select the correct outputs file based on environment
outputs_file="cdk-outputs-${environment}.json"
stack_name="${environment}-LeetbotCloud"

# Check if outputs file exists
if [ ! -f "$outputs_file" ]; then
  echo "Error: $outputs_file not found. Make sure you've deployed the $environment environment."
  exit 1
fi

# Read the secret ARN from the environment-specific outputs file
arn=$(jq -r ".[\"$stack_name\"] | to_entries[] | select(.key | startswith(\"DiscordBotDiscordBotTokenArn\")) | .value" "$outputs_file")

if [ "$arn" = "null" ] || [ -z "$arn" ]; then
  echo "Error: Could not find Discord bot token ARN in $outputs_file for stack $stack_name"
  exit 1
fi

echo "Using ARN from $outputs_file: $arn"

# Update the secret value using the specified AWS profile
aws-vault exec "$aws_profile" -- aws secretsmanager update-secret --secret-id "$arn" --secret-string "$new_secret_value"