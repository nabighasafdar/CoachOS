#!/usr/bin/env bash
set -euo pipefail
API="${COACHOS_API_URL:-http://localhost:8000}"

echo "== health =="
curl -s "$API/health" | python3 -m json.tool

echo "== seed =="
curl -s -X POST "$API/demo/seed" | python3 -m json.tool

echo "== low sleep check-in =="
curl -s -X POST "$API/log/checkin" \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id":"demo-user",
    "signals":{
      "user_id":"demo-user",
      "date":"'"$(date -u +%F)"'",
      "sleep":3,
      "energy":4,
      "soreness":6,
      "injury_flag":false,
      "injury_note":"",
      "weather_summary":"",
      "precip_mm":0
    }
  }' | python3 -m json.tool

echo "== activity =="
curl -s "$API/activity/demo-user" | python3 -m json.tool

echo "== accountability =="
curl -s -X POST "$API/accountability/run" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"demo-user","secret":"coachos-dev-secret"}' | python3 -m json.tool

echo "Demo script complete."
