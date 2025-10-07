#!/usr/bin/env bash
set -euo pipefail

REGION="eu-north-1"
PRD_PROFILE="leetbot-prd"
DEV_PROFILE="leetbot-dev"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_TABLE="$("$SCRIPT_DIR/getTableName.sh" prd LeetbotCloud)"
DEV_TABLE="$("$SCRIPT_DIR/getTableName.sh" dev LeetbotCloud)"

echo "Copying from $PRD_TABLE → $DEV_TABLE"

LAST_KEY=""
PAGE=1

while true; do
  echo "🔹 Scanning page $PAGE..."
  if [ -z "$LAST_KEY" ]; then
    RESP=$(aws-vault exec "$PRD_PROFILE" -- aws dynamodb scan \
      --region "$REGION" \
      --table-name "$PRD_TABLE")
  else
    RESP=$(aws-vault exec "$PRD_PROFILE" -- aws dynamodb scan \
      --region "$REGION" \
      --table-name "$PRD_TABLE" \
      --exclusive-start-key "$LAST_KEY")
  fi

  ITEMS=$(echo "$RESP" | jq -c '.Items')
  COUNT=$(echo "$ITEMS" | jq 'length')
  echo "  Found $COUNT items"

  # split into chunks of 25
  for i in $(seq 0 24 $((COUNT - 1))); do
    CHUNK=$(echo "$ITEMS" | jq -c ".[$i:$((i+25))]")
    if [ "$(echo "$CHUNK" | jq 'length')" -eq 0 ]; then continue; fi

    jq --arg table "$DEV_TABLE" '{($table): [.[] | {PutRequest:{Item:.}}]}' <<<"$CHUNK" > batch.json

    aws-vault exec "$DEV_PROFILE" -- aws dynamodb batch-write-item \
      --region "$REGION" \
      --request-items file://batch.json >/dev/null
  done

  LAST_KEY=$(echo "$RESP" | jq -r '.LastEvaluatedKey // empty | tostring')
  if [ -z "$LAST_KEY" ]; then break; fi
  PAGE=$((PAGE + 1))
done

echo "✅ Done."