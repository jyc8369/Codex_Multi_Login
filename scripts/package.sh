#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/extension"
OUTPUT_VSIX="$EXTENSION_DIR/-codex-multi-login-0.1.0.vsix"

cd "$ROOT_DIR"
npm run compile

cd "$EXTENSION_DIR"
npx vsce package --allow-missing-repository --no-dependencies

echo "Packaged extension: $OUTPUT_VSIX"
