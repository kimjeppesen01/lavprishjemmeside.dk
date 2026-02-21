#!/usr/bin/env bash
# First-run setup script
set -euo pipefail

AGENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$AGENT_DIR/.venv"

echo "==> Setting up Personal Agent at: $AGENT_DIR"

# Check Python 3.12
if ! command -v python3.12 &>/dev/null; then
    echo "Python 3.12 not found. Installing via Homebrew..."
    brew install python@3.12
fi

echo "Python version: $(python3.12 --version)"

# Create venv if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "==> Creating virtual environment..."
    python3.12 -m venv "$VENV_DIR"
fi

# Activate and install
source "$VENV_DIR/bin/activate"
echo "==> Installing dependencies..."
pip install --upgrade pip
pip install -r "$AGENT_DIR/requirements.txt"

# Install Playwright browsers (Week 3 tool)
echo "==> Installing Playwright Chromium..."
playwright install chromium || echo "(Playwright install deferred — run manually when ready)"

# Verify .env exists
if [ ! -f "$AGENT_DIR/.env" ]; then
    echo "==> Creating .env from template..."
    cp "$AGENT_DIR/.env.example" "$AGENT_DIR/.env"
    echo ""
    echo "  ACTION REQUIRED: Fill in your API keys in .env before starting the agent."
    echo "  File: $AGENT_DIR/.env"
fi

echo ""
echo "==> Setup complete!"
echo "    Next steps:"
echo "    1. Fill in $AGENT_DIR/.env with your API keys"
echo "    2. Run: bash scripts/install_service.sh"
echo "    3. Check Slack — the agent should come online"
