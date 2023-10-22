#!/bin/bash

# Check that both a payload and AWS profile are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <request_payload> <aws_profile>"
  exit 1
fi

payload=$1
aws_profile=$2

# Read the function name from cdk-outputs.json
function_name=$(jq -r '.LeetbotAwsStack | to_entries[] | select(.key | startswith("DiscordBotDiscordWatcherName")) | .value' cdk-outputs.json)

# Update the secret value using the specified AWS profile
aws lambda invoke --function-name "$function_name" --payload "$payload" --cli-binary-format raw-in-base64-out --profile "$aws_profile" /dev/stdout
