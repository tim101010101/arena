#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

if ! command -v bun &>/dev/null; then
  echo "Error: bun not found in PATH" >&2
  exit 1
fi

if [ ! -f dist/index.js ]; then
  echo "[arena-mcp] Building..." >&2
  bun run build
fi

exec bun dist/index.js "$@"
