#!/usr/bin/env bash
set -euo pipefail

# Gets the stack's main table name from the cdk-outputs-[env].json file (for the correct environment)
# Usage: getTableName.sh <environment> <stack_name> [table_name_arg]
ENVIRONMENT=$1
STACK_NAME=$2
TABLE_NAME_ARG=${3:-}
OUTPUTS_FILE="cdk-outputs-$ENVIRONMENT.json"

if [ -z "$TABLE_NAME_ARG" ]; then
  if [ ! -f "$OUTPUTS_FILE" ]; then
    echo "Error: $OUTPUTS_FILE not found. Make sure you've deployed the $ENVIRONMENT environment."
    exit 1
  fi

  TABLE=$(jq -r "
    (.[\"$ENVIRONMENT-$STACK_NAME\"] // .[\"$STACK_NAME\"])
    | to_entries[]
    | select(.key | startswith(\"LeetbotTableTableName\"))
    | .value
  " "$OUTPUTS_FILE")

  if [ "$TABLE" = "null" ] || [ -z "$TABLE" ]; then
    echo "Error: Could not find DynamoDB table name in $OUTPUTS_FILE for stack $STACK_NAME"
    exit 1
  fi
  echo "$TABLE"
else
  echo "$TABLE_NAME_ARG"
fi