#!/bin/sh
# Create lavpris-cms ZIP for distribution.
# Run from repo root: npm run package   or   sh scripts/create-zip.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VERSION="${ZIP_VERSION:-v1.1}"
OUT="lavpris-cms-${VERSION}.zip"
TMP=".zip-tmp"

rm -f "$OUT"
mkdir -p "$TMP"
rsync -a \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='api/node_modules' \
  --exclude='dist' \
  --exclude='.astro' \
  --exclude='.claude' \
  --exclude='.cursor' \
  --exclude='api/.env' \
  --exclude='.env' \
  --exclude='personal-agent' \
  --exclude='.zip-tmp' \
  --exclude='*.zip' \
  --exclude='*.dmg' \
  --exclude='.DS_Store' \
  --exclude='api/.DS_Store' \
  --exclude='tasks' \
  --exclude='uploads' \
  --exclude='FUTURE_IMPLEMENTATIONS.md' \
  --exclude='HANDOVER.md' \
  --exclude='ADMIN_DASHBOARD_UI_IMPLEMENTATION_GUIDE.md' \
  --exclude='TODO_COMPONENT_HARDENING.md' \
  --exclude='TODO_SEO_HANDOVER.md' \
  --exclude='COMPONENT_LIBRARY_AND_DESIGN_SYSTEM_SPEC.md' \
  --exclude='VISUAL_PAGE_BUILDER_SPEC.md' \
  . "$TMP/lavpris-cms/"
(cd "$TMP" && zip -rq "../$OUT" lavpris-cms)
rm -rf "$TMP"
echo "Created $OUT"
