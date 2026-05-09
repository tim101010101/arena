#!/usr/bin/env bash
set -euo pipefail

REPO="tim101010101/arena"
BINARY_NAME="arena"
INSTALL_DIR="${ARENA_INSTALL_DIR:-$HOME/.local/bin}"

# --- detect platform ---
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  linux|darwin) ;;
  *) echo "error: unsupported OS: $OS" >&2; exit 1 ;;
esac

case "$ARCH" in
  x86_64)         ARCH="x64" ;;
  aarch64|arm64)  ARCH="arm64" ;;
  *) echo "error: unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

PLATFORM="${OS}-${ARCH}"

# --- resolve latest release ---
if [ -n "${ARENA_VERSION:-}" ]; then
  TAG="$ARENA_VERSION"
else
  TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep '"tag_name"' \
    | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
fi

if [ -z "$TAG" ]; then
  echo "error: could not determine latest release (GitHub API rate limit?)" >&2
  echo "       set ARENA_VERSION=vX.Y.Z to pin a version" >&2
  exit 1
fi

BINARY="arena-${PLATFORM}"
URL="https://github.com/$REPO/releases/download/$TAG/$BINARY"

echo "Installing arena $TAG ($PLATFORM) → $INSTALL_DIR/$BINARY_NAME"

mkdir -p "$INSTALL_DIR"
curl -fsSL --progress-bar "$URL" -o "$INSTALL_DIR/$BINARY_NAME"
chmod +x "$INSTALL_DIR/$BINARY_NAME"

echo "Done. arena $TAG installed."

# warn if install dir is not in PATH
if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
  echo ""
  echo "  $INSTALL_DIR is not in your PATH."
  echo "  Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  echo "    export PATH=\"$INSTALL_DIR:\$PATH\""
fi
