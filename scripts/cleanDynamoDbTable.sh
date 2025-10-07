#!/usr/bin/env bash
# Wipe all items from a DynamoDB table using aws-vault + AWS CLI v2.
set -euo pipefail

# Check that AWS profile and environment are provided, table name is optional
if [ "$#" -lt 2 ] || [ "$#" -gt 3 ]; then
  echo "Usage: $0 <aws_profile> <environment> [table_name]"
  echo "Example: $0 leetbot-dev dev"
  echo "  If table_name is omitted, it will be auto-discovered from cdk-outputs-<environment>.json"
  exit 1
fi

aws_profile=$1
environment=$2
table_name_arg=${3:-}

# Select the correct outputs file and stack name based on environment
outputs_file="cdk-outputs-${environment}.json"
stack_name="${environment}-LeetbotCloud"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TABLE="$("$SCRIPT_DIR/getTableName.sh" "$environment" "LeetbotCloud" "$table_name_arg")"
echo "Using table: $TABLE"

av() { aws-vault exec "$aws_profile" -- aws "$@"; }

# --- Discover key schema (PK + optional SK) ---
DESC_JSON="$(av dynamodb describe-table --table-name "$TABLE" --no-cli-pager --output json)"
PK_NAME="$(jq -r '.Table.KeySchema[] | select(.KeyType=="HASH")  | .AttributeName' <<<"$DESC_JSON")"
SK_NAME="$(jq -r '.Table.KeySchema[] | select(.KeyType=="RANGE") | .AttributeName // empty' <<<"$DESC_JSON")"

# Build projection for a minimal scan (only key attributes)
if [[ -n "$SK_NAME" ]]; then
  PROJ="#pk,#sk"
  EAN="$(jq -n --arg pk "$PK_NAME" --arg sk "$SK_NAME" '{ "#pk":$pk, "#sk":$sk }')"
else
  PROJ="#pk"
  EAN="$(jq -n --arg pk "$PK_NAME" '{ "#pk":$pk }')"
fi

# --- Stream all keys via scan (auto-paginates) -> one DeleteRequest per line ---
# NOTE: Items retain DynamoDB JSON types (S, N, etc.), which batch-write-item expects.
TMPDIR="$(mktemp -d)"; BATCH_FILE="$TMPDIR/batch.json"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

echo "Scanning keys from $TABLE ..."
av dynamodb scan \
  --table-name "$TABLE" \
  --projection-expression "$PROJ" \
  --expression-attribute-names "$EAN" \
  --no-cli-pager \
  --output json \
| jq -c '.Items[] | {DeleteRequest:{Key:.}}' > "$TMPDIR/requests.ndjson" || true

TOTAL=$(wc -l < "$TMPDIR/requests.ndjson" || echo 0)
if [[ "$TOTAL" -eq 0 ]]; then
  echo "Nothing to delete."
  exit 0
fi

echo "Deleting $TOTAL item(s) from $TABLE ..."

# --- Send deletes in batches of 25, retrying UnprocessedItems with backoff ---
batch_write() {
  local input_json="$1"
  # Write ONLY the value for --request-items (table->array), not { "RequestItems": ... }
  printf '{ "%s": %s }\n' "$TABLE" "$input_json" > "$BATCH_FILE"

  local backoff=0.05
  while :; do
    RESP="$(av dynamodb batch-write-item --request-items "file://$BATCH_FILE" --no-cli-pager --output json)"
    UNPROC="$(jq -c --arg t "$TABLE" '.UnprocessedItems[$t] // []' <<<"$RESP")"
    if [[ "$(jq 'length' <<<"$UNPROC")" -eq 0 ]]; then
      break
    fi
    sleep "$backoff"
    backoff=$(awk -v b="$backoff" 'BEGIN{ b*=1.3; if (b>2) b=2; print b }')
    # Retry only unprocessed items — again as the value for --request-items
    printf '{ "%s": %s }\n' "$TABLE" "$UNPROC" > "$BATCH_FILE"
  done
}

# Read 25 lines at a time and send
buf="[]"; count=0; deleted=0
while IFS= read -r line || [[ -n "$line" ]]; do
  buf="$(jq -c --argjson it "$line" '. + [$it]' <<<"$buf")"
  count=$((count+1))
  if (( count == 25 )); then
    batch_write "$buf"
    deleted=$((deleted+count))
    printf "\rDeleted: %d/%d" "$deleted" "$TOTAL"
    buf="[]"; count=0
  fi
done < "$TMPDIR/requests.ndjson"

# Flush remainder
if (( count > 0 )); then
  batch_write "$buf"
  deleted=$((deleted+count))
  printf "\rDeleted: %d/%d" "$deleted" "$TOTAL"
fi
echo -e "\nDone."