#!/usr/bin/env bash
# Patch DealScout Vapi assistant with property-scoped prompt and tool descriptions.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"
ASSISTANT_ID="${VAPI_ASSISTANT_ID:-6f6b90bf-cb7b-4e4e-8b6f-894c86f7440a}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

: "${VAPI_API_KEY:?Set VAPI_API_KEY in .env.local or the environment}"

PROMPT="$(cat "$ROOT/scripts/dealscout-assistant-prompt.txt")"
FIRST_MESSAGE="Hey, I'm DealScout. I'm here about {{listing_address}} at {{list_price}}. What would you like to know about this listing — the numbers, the neighborhood, or something else?"

CURRENT="$(curl -sS "https://api.vapi.ai/assistant/${ASSISTANT_ID}" \
  -H "Authorization: Bearer ${VAPI_API_KEY}")"

BODY="$(jq -nc \
  --argjson current "$CURRENT" \
  --arg content "$PROMPT" \
  --arg firstMessage "$FIRST_MESSAGE" \
  --arg getDealDesc 'Fetch verified property details from the database. Always use listing_id {{listing_id}} from call context unless the user explicitly specifies another property.' \
  --arg areaDesc 'Get aggregated neighborhood stats: crime index, violent and property crime rates, school rating, rent growth, and market notes. Call whenever the investor asks about crime, safety, neighborhood quality, schools, or the area. Always use listing_id {{listing_id}} from call context unless the user explicitly specifies another property.' \
  --arg numbersDesc 'Run investment numbers: gross rent, expenses, NOI, cap rate, and cash-on-cash. Always use listing_id {{listing_id}} from call context unless the user explicitly specifies another property.' \
  --arg saveDesc 'Save a listing to the investor watchlist with optional notes and rating. Use listing_id {{listing_id}} for the property on this call unless the user names another.' \
  --arg photoDesc 'Analyze the listing photo with AI vision for condition and rehab red flags. Always use listing_id {{listing_id}} from call context unless the user specifies another property.' \
  --arg similarDesc 'Find up to 3 similar listings in the same market. Always use listing_id {{listing_id}} from call context unless the user specifies another property.' \
  --argjson silentToolMessages '[{"type":"request-start","content":"","blocking":false},{"type":"request-complete","content":""},{"type":"request-failed","content":"Sorry, I could not get that data."}]' \
  '{
    firstMessage: $firstMessage,
    model: ($current.model
      | .messages = [{ role: "system", content: $content }]
      | .tools = (.tools | map(
          if .function.name == "get_deal" then
              .function.description = $getDealDesc
              | .async = true
              | .messages = $silentToolMessages
            elif .function.name == "area_report" then
              .function.description = $areaDesc | .messages = $silentToolMessages
            elif .function.name == "run_numbers" then
              .function.description = $numbersDesc | .messages = $silentToolMessages
            elif .function.name == "save_deal" then
              .function.description = $saveDesc | .messages = $silentToolMessages
            elif .function.name == "analyze_listing_photo" then
              .function.description = $photoDesc | .messages = $silentToolMessages
            elif .function.name == "search_similar" then
              .function.description = $similarDesc | .messages = $silentToolMessages
            else . end
        ))
    )
  }')"

echo "PATCH https://api.vapi.ai/assistant/${ASSISTANT_ID}" >&2
HTTP_CODE="$(curl -sS -o /tmp/dealscout-patch.json -w '%{http_code}' \
  -X PATCH "https://api.vapi.ai/assistant/${ASSISTANT_ID}" \
  -H "Authorization: Bearer ${VAPI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "$BODY")"

cat /tmp/dealscout-patch.json | jq '{id, name, firstMessage, systemPreview: .model.messages[0].content[0:120], tools: [.model.tools[]?.function | {name, description: .description[0:90]}]}' 2>/dev/null || cat /tmp/dealscout-patch.json

if [[ "$HTTP_CODE" -ge 400 ]]; then
  echo "HTTP $HTTP_CODE" >&2
  exit 1
fi

echo "DealScout assistant updated." >&2
