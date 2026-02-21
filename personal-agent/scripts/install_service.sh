#!/usr/bin/env bash
# Install the agent as a macOS launchd service
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST_SRC="$AGENT_DIR/launchd/com.samlino.personalagent.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.samlino.personalagent.plist"
LABEL="com.samlino.personalagent"

echo "==> Installing Personal Agent launchd service..."

# Create log directory
mkdir -p "$AGENT_DIR/audit/logs/system"

# Unload existing service if running
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true

# Copy plist
cp "$PLIST_SRC" "$PLIST_DEST"
echo "    Plist copied to: $PLIST_DEST"

# Load service
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"
echo ""
echo "==> Service installed and started!"
echo ""
launchctl print "gui/$(id -u)/$LABEL"
echo ""
echo "    Logs:"
echo "      stdout: $AGENT_DIR/audit/logs/system/stdout.log"
echo "      stderr: $AGENT_DIR/audit/logs/system/stderr.log"
echo ""
echo "    To stop:   bash scripts/uninstall_service.sh"
echo "    To check:  launchctl print gui/\$(id -u)/$LABEL"
