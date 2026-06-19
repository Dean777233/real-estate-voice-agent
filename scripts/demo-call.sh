#!/usr/bin/env bash
# Start a DealScout Vapi demo call with Austin listing context.
# Usage:
#   ./scripts/demo-call.sh              # web call (POST /call/web)
#   ./scripts/demo-call.sh outbound     # outbound PSTN (needs VAPI_PHONE_NUMBER_ID + CUSTOMER_PHONE)
#   ./scripts/demo-call.sh curl         # print equivalent curl (no request)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

ASSISTANT_ID="${VAPI_ASSISTANT_ID:-6f6b90bf-cb7b-4e4e-8b6f-894c86f7440a}"
LISTING_ID="${LISTING_ID:-76c2dbd6-71fe-4e33-837e-a77fdf27c292}"
LISTING_ADDRESS="${LISTING_ADDRESS:-742 Evergreen Terrace, Austin TX}"
LIST_PRICE="${LIST_PRICE:-\$285,000}"

MODE="${1:-web}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

: "${VAPI_API_KEY:?Set VAPI_API_KEY in .env.local or the environment}"

BODY="$(jq -nc \
  --arg assistantId "$ASSISTANT_ID" \
  --arg listingId "$LISTING_ID" \
  --arg listingAddress "$LISTING_ADDRESS" \
  --arg listPrice "$LIST_PRICE" \
  '{
    assistantId: $assistantId,
    metadata: { listing_id: $listingId },
    assistantOverrides: {
      variableValues: {
        listing_id: $listingId,
        listing_address: $listingAddress,
        list_price: $listPrice
      },
      firstMessage: ("Hey, I'm DealScout. I'm here about " + $listingAddress + " at " + $listPrice + ". What would you like to know about this listing — the numbers, the neighborhood, or something else?")
    }
  }')"

print_curl() {
  local url="$1"
  cat <<EOF
# Equivalent curl (replace YOUR_VAPI_PRIVATE_KEY):
curl -sS -X POST '$url' \\
  -H 'Authorization: Bearer YOUR_VAPI_PRIVATE_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '$BODY'
EOF
}

case "$MODE" in
  curl)
    print_curl "https://api.vapi.ai/call/web"
    echo
    print_curl "https://api.vapi.ai/call"
    echo
    echo "# Outbound adds: phoneNumberId, customer.number (see script outbound branch)."
    exit 0
    ;;
  web)
    URL="https://api.vapi.ai/call/web"
    : "${VAPI_PUBLIC_KEY:?Set VAPI_PUBLIC_KEY in .env.local for web calls}"
    AUTH_KEY="$VAPI_PUBLIC_KEY"
  ;;
  outbound)
    URL="https://api.vapi.ai/call"
    AUTH_KEY="$VAPI_API_KEY"
    : "${VAPI_PHONE_NUMBER_ID:?Set VAPI_PHONE_NUMBER_ID for outbound calls}"
    : "${CUSTOMER_PHONE:?Set CUSTOMER_PHONE (E.164, e.g. +15125550100)}"
    BODY="$(jq -nc \
      --argjson base "$BODY" \
      --arg phoneNumberId "$VAPI_PHONE_NUMBER_ID" \
      --arg number "$CUSTOMER_PHONE" \
      '$base + { phoneNumberId: $phoneNumberId, customer: { number: $number } }')"
    ;;
  *)
    echo "Usage: $0 [web|outbound|curl]" >&2
    exit 1
    ;;
esac

echo "POST $URL" >&2
RESP="$(curl -sS -w '\n%{http_code}' -X POST "$URL" \
  -H "Authorization: Bearer ${AUTH_KEY}" \
  -H 'Content-Type: application/json' \
  -d "$BODY")"
HTTP_CODE="${RESP##*$'\n'}"
BODY_OUT="${RESP%$'\n'*}"
echo "$BODY_OUT" | jq . 2>/dev/null || echo "$BODY_OUT"

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "HTTP $HTTP_CODE" >&2
  echo "If Unauthorized: web mode needs VAPI_PUBLIC_KEY; outbound/server API needs VAPI_API_KEY (private)." >&2
  echo "Dashboard web call: Assistants → DealScout → Test → Web call; set variableValues / metadata as in scripts/demo-ids.json." >&2
  exit 1
fi

# Web responses often include webCallUrl or id for joining the call.
echo "$BODY_OUT" | jq -r '.webCallUrl // .url // .id // empty' 2>/dev/null || true
