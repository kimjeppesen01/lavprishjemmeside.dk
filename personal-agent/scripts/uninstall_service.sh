#!/usr/bin/env bash
# Remove the agent launchd service
set -euo pipefail

LABEL="com.samlino.personalagent"
PLIST_DEST="$HOME/Library/LaunchAgents/$LABEL.plist"

echo "==> Stopping and removing Personal Agent service..."

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || echo "  (service was not running)"
rm -f "$PLIST_DEST"

echo "==> Service removed. The agent will no longer start at login."
