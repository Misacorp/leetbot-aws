#!/bin/bash

# Check that parameter value, AWS profile, and environment are provided
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <discord_public_key> <aws_profile> <environment>"
  echo "Example: $0 'a1b2c3d4e5f6...' leetbot-dev dev"
  echo "Note: Discord public key should be 64 hex characters"
  exit 1
fi

discord_public_key=$1
aws_profile=$2
environment=$3

# Validate public key format (should be 64 hex characters)
if ! [[ "$discord_public_key" =~ ^[0-9a-fA-F]{64}$ ]]; then
  echo "Error: Discord public key must be exactly 64 hexadecimal characters"
  echo "Got: $discord_public_key (${#discord_public_key} characters)"
  exit 1
fi

# Select the correct outputs file based on environment
outputs_file="cdk-outputs-${environment}.json"
stack_name="${environment}-LeetbotCloud"

# Check if outputs file exists
if [ ! -f "$outputs_file" ]; then
  echo "Error: $outputs_file not found. Make sure you've deployed the $environment environment."
  exit 1
fi

# Read the parameter name from the environment-specific outputs file
parameter_name=$(jq -r ".[\"$stack_name\"] | to_entries[] | select(.key | startswith(\"DiscordCommandsDiscordPublicKeyParam\")) | .value" "$outputs_file")

if [ "$parameter_name" = "null" ] || [ -z "$parameter_name" ]; then
  echo "Error: Could not find Discord public key parameter name in $outputs_file for stack $stack_name"
  exit 1
fi

echo "Using parameter name from $outputs_file: $parameter_name"

# Update the parameter value using the specified AWS profile
echo "Setting Discord public key parameter..."
aws-vault exec "$aws_profile" -- aws ssm put-parameter \
  --name "$parameter_name" \
  --value "$discord_public_key" \
  --type "String" \
  --overwrite

if [ $? -eq 0 ]; then
  echo "✅ Successfully updated Discord public key parameter: $parameter_name"
else
  echo "❌ Failed to update Discord public key parameter"
  exit 1
fi
