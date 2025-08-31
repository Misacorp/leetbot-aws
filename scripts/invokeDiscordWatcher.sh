#!/bin/bash

# Check that payload, AWS profile, and environment are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <request_payload> <aws_profile> <environment>"
  echo "Example: $0 '{\"test\":true}' leetbot-dev dev"
  exit 1
fi

payload=$1
aws_profile=$2
environment=$3

# Select the correct outputs file and stack name based on environment
outputs_file="cdk-outputs-${environment}.json"
stack_name="${environment}-LeetbotCloud"

# Check if outputs file exists
if [ ! -f "$outputs_file" ]; then
  echo "Error: $outputs_file not found. Make sure you've deployed the $environment environment."
  exit 1
fi

# Read the function name from the environment-specific outputs file
function_name=$(jq -r ".[\"$stack_name\"] | to_entries[] | select(.key | startswith(\"DiscordBotDiscordWatcherName\")) | .value" "$outputs_file")

if [ "$function_name" = "null" ] || [ -z "$function_name" ]; then
  echo "Error: Could not find Discord watcher function name in $outputs_file for stack $stack_name"
  exit 1
fi

echo "Invoking function: $function_name"

# Invoke the Lambda function using the specified AWS profile
aws-vault exec "$aws_profile" -- aws lambda invoke --function-name "$function_name" --payload "$payload" --cli-binary-format raw-in-base64-out /dev/stdout
