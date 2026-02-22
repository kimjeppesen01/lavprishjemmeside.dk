#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$AGENT_DIR/data/ian.pid"
ENV_FILE="$AGENT_DIR/.env"
IANCTL="$AGENT_DIR/scripts/ianctl.sh"

mkdir -p "$AGENT_DIR/data" "$AGENT_DIR/audit/logs/system"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

API_URL="${KANBAN_API_URL:-}"
API_KEY="${KANBAN_API_KEY:-}"
ENABLED="1"

if [ -n "$API_URL" ] && [ -n "$API_KEY" ]; then
  RESP="$(curl -fsS -m 10 -H "x-api-key: $API_KEY" "$API_URL/master/ian-control" 2>/dev/null || true)"
  if echo "$RESP" | grep -q '"enabled":false'; then
    ENABLED="0"
  fi
fi

if [ "$ENABLED" = "0" ]; then
  "$IANCTL" stop >/dev/null 2>&1 || true
  echo "$(date '+%Y-%m-%d %H:%M:%S'): IAN disabled by control-plane" >> "$AGENT_DIR/audit/logs/system/watchdog.log"
  exit 0
fi

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  exit 0
fi

"$IANCTL" start >/dev/null 2>&1 || true
echo "$(date '+%Y-%m-%d %H:%M:%S'): IAN restarted by watchdog" >> "$AGENT_DIR/audit/logs/system/watchdog.log"
