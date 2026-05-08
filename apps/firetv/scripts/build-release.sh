#!/usr/bin/env bash
# Build APK release : charge .env.local puis surcharge avec .env.production.local
# pour que l'URL de l'API pointe sur Vercel prod, sans avoir à éditer manuellement
# les fichiers à chaque switch dev → release.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f ./.env.local ]; then
  set -a; . ./.env.local; set +a
fi

if [ -f ./.env.production.local ]; then
  set -a; . ./.env.production.local; set +a
else
  echo "⚠ .env.production.local absent — l'APK release utilisera la valeur de .env.local"
  echo "  (typiquement http://10.0.2.2:3000 — pas joignable depuis un Fire TV stick)."
  echo "  Crée .env.production.local avec EXPO_PUBLIC_API_BASE_URL=<URL_VERCEL>."
  echo ""
fi

echo "TOT — Build APK release"
echo "→ EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL:-(non défini)}"
echo ""

cd android && exec ./gradlew :app:assembleRelease
