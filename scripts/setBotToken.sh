#!/bin/bash

# Check that parameter value, AWS profile, and environment are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <bot_token> <aws_profile> <environment>"
  echo "Example: $0 'your-token' leetbot-dev dev"
  exit 1
fi

bot_token=$1
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

# Read the parameter name from the environment-specific outputs file
parameter_name=$(jq -r ".[\"$stack_name\"] | to_entries[] | select(.key | startswith(\"DiscordParametersDiscordBotTokenParameter\")) | .value" "$outputs_file")

if [ "$parameter_name" = "null" ] || [ -z "$parameter_name" ]; then
  echo "Error: Could not find Discord bot token parameter name in $outputs_file for stack $stack_name"
  exit 1
fi

echo "Using parameter name from $outputs_file: $parameter_name"

# Update the parameter value using the specified AWS profile
echo "Setting Discord bot token parameter..."
aws-vault exec "$aws_profile" -- aws ssm put-parameter \
  --name "$parameter_name" \
  --value "$bot_token" \
  --type "SecureString" \
  --overwrite

if [ $? -eq 0 ]; then
  echo "✅ Successfully updated Discord bot token parameter: $parameter_name"
else
  echo "❌ Failed to update Discord bot token parameter"
  exit 1
fi
