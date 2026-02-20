#!/usr/bin/env bash
set -euo pipefail

echo "[1/3] Build check"
npm run build

echo "[2/3] API restart trigger"
mkdir -p api/tmp
touch api/tmp/restart.txt
echo "Touched api/tmp/restart.txt"

echo "[3/3] Health smoke test"
API_URL="${PUBLIC_API_URL:-https://api.lavprishjemmeside.dk}"
HEALTH_URL="${API_URL%/}/health"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl not found; skipping health smoke test"
  exit 0
fi

set +e
HTTP_CODE="$(curl -sS -m 20 -o /tmp/post_impl_health.json -w "%{http_code}" "$HEALTH_URL")"
CURL_EXIT=$?
set -e

if [ $CURL_EXIT -ne 0 ]; then
  if [ "${STRICT_HEALTH:-0}" = "1" ]; then
    echo "Health check failed (curl exit $CURL_EXIT): $HEALTH_URL"
    exit 1
  fi
  echo "Health check warning (curl exit $CURL_EXIT): $HEALTH_URL"
  exit 0
fi

if [ "$HTTP_CODE" != "200" ]; then
  if [ "${STRICT_HEALTH:-0}" = "1" ]; then
    echo "Health check failed (HTTP $HTTP_CODE): $HEALTH_URL"
    cat /tmp/post_impl_health.json || true
    exit 1
  fi
  echo "Health check warning (HTTP $HTTP_CODE): $HEALTH_URL"
  cat /tmp/post_impl_health.json || true
  exit 0
fi

echo "Health OK (HTTP 200): $HEALTH_URL"
cat /tmp/post_impl_health.json || true
