#!/usr/bin/env bash
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PYTHON3=""
for p in python3.12 python3.11 python3.10 python3.9 python3; do
  if command -v "$p" >/dev/null 2>&1; then
    PYTHON3="$p"
    break
  fi
done
if [ -z "$PYTHON3" ]; then
  for alt in /opt/alt/alt-python3{12,11,10,9}/root/usr/bin/python3; do
    if [ -x "$alt" ]; then
      PYTHON3="$alt"
      break
    fi
  done
fi

if [ -z "$PYTHON3" ]; then
  echo "ERROR: Python 3.9+ not found"
  exit 1
fi

echo "Python: $PYTHON3 ($($PYTHON3 --version))"
cd "$AGENT_DIR"

"$PYTHON3" -m venv .venv
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

mkdir -p data audit/logs/system memory/markdown

CRON_CMD="* * * * * $AGENT_DIR/scripts/watchdog.sh"
(crontab -l 2>/dev/null | grep -v 'watchdog.sh'; echo "$CRON_CMD") | crontab -

echo "Deployment setup complete."
echo "1) Copy .env.server-example to .env and set secrets"
echo "2) Run: $AGENT_DIR/scripts/watchdog.sh"
