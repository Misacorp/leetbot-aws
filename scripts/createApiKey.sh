#!/bin/bash

# Creates a consumer key for the Leet API and stores its hash in Parameter Store.
# The key itself is printed once and never saved.

if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <environment> <aws_profile> [--replace-oldest]"
  echo "Example: $0 dev leetbot-dev"
  exit 1
fi

environment=$1
aws_profile=$2
extra_flag=$3

if [ "$environment" != "dev" ] && [ "$environment" != "prd" ]; then
  echo "Error: environment must be dev or prd"
  exit 1
fi

if [ -n "$extra_flag" ] && [ "$extra_flag" != "--replace-oldest" ]; then
  echo "Error: unknown option $extra_flag"
  exit 1
fi

aws-vault exec "$aws_profile" -- npx ts-node scripts/createApiKey.ts "$environment" $extra_flag
