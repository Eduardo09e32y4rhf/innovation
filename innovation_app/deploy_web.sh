#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$SCRIPT_DIR"

flutter clean
flutter pub get
flutter build web --release

echo "Build pronto em: $SCRIPT_DIR/build/web"
