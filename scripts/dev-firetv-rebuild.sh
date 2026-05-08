#!/usr/bin/env bash
# Rebuild de l'APK debug en figeant l'URL Metro sur 10.0.2.2:8081 (alias AVD vers le host).
# À refaire si tu changes de réseau / d'AVD / si l'app dans l'émulateur n'arrive plus à
# joindre Metro malgré `pnpm dev:firetv` qui tourne.
#
# Usage : pnpm dev:firetv:rebuild
#   TOT_PACKAGER_HOST=192.168.1.42 pnpm dev:firetv:rebuild   # Fire TV stick physique
set -euo pipefail

HOST="${TOT_PACKAGER_HOST:-10.0.2.2}"

echo ""
echo "TOT — Rebuild APK debug"
echo "→ REACT_NATIVE_PACKAGER_HOSTNAME=$HOST"
echo "  (Metro sera joint à http://$HOST:8081 depuis le device)"
echo ""

if command -v adb >/dev/null 2>&1; then
  adb shell am force-stop com.tot.firetv >/dev/null 2>&1 || true
fi

cd "$(dirname "$0")/../apps/firetv"
exec env REACT_NATIVE_PACKAGER_HOSTNAME="$HOST" npx expo run:android --no-bundler
