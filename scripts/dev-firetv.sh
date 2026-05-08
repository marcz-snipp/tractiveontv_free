#!/usr/bin/env bash
set -euo pipefail

PROD_URL="https://tractiveontv-api.vercel.app"
AVD_URL="http://10.0.2.2:3000"

# Détecte l'IP LAN (en0 = Wi-Fi/ethernet primaire sur Mac, en1 = secondaire).
detect_lan_ip() {
  local ip=""
  if command -v ipconfig >/dev/null 2>&1; then
    ip=$(ipconfig getifaddr en0 2>/dev/null || true)
    if [ -z "$ip" ]; then
      ip=$(ipconfig getifaddr en1 2>/dev/null || true)
    fi
  fi
  echo "$ip"
}

LAN_IP="$(detect_lan_ip)"
LAN_URL=""
if [ -n "$LAN_IP" ]; then
  LAN_URL="http://${LAN_IP}:3000"
fi

# Permet de bypasser le prompt en CI ou via alias :
# TOT_API_TARGET=local|prod|lan pnpm dev:firetv
target=""
case "${TOT_API_TARGET:-}" in
  local|avd) target="$AVD_URL" ;;
  prod|vercel) target="$PROD_URL" ;;
  lan|stick)
    if [ -z "$LAN_URL" ]; then
      echo "Aucune IP LAN détectée (en0/en1)." >&2
      exit 1
    fi
    target="$LAN_URL"
    ;;
esac

if [ -z "$target" ]; then
  echo ""
  echo "TOT — Lanceur Fire TV"
  echo ""
  echo "Vers quelle API pointer ?"
  echo "  1) Local AVD          → $AVD_URL"
  if [ -n "$LAN_URL" ]; then
    echo "  2) Local LAN (Stick)  → $LAN_URL"
  else
    echo "  2) Local LAN (Stick)  → (aucune IP LAN détectée)"
  fi
  echo "  3) Vercel prod        → $PROD_URL"
  echo ""
  read -rp "Choix [1/2/3] (défaut: 1) " choice
  choice="${choice:-1}"

  case "$choice" in
    1) target="$AVD_URL" ;;
    2)
      if [ -z "$LAN_URL" ]; then
        echo "Aucune IP LAN détectée. Annulé." >&2
        exit 1
      fi
      target="$LAN_URL"
      ;;
    3) target="$PROD_URL" ;;
    *) echo "Choix invalide." >&2; exit 1 ;;
  esac
fi

echo ""
echo "→ EXPO_PUBLIC_API_BASE_URL=$target"
echo ""

# Si un AVD/device Android est branché, met en place les reverses
# pour que l'app y joigne Metro (8081) et l'API locale (3000).
if command -v adb >/dev/null 2>&1; then
  device_count=$(adb devices 2>/dev/null | awk 'NR>1 && $2=="device"' | wc -l | tr -d ' ')
  if [ "$device_count" -ge 1 ]; then
    if [ "$device_count" -gt 1 ]; then
      echo "⚠ Plusieurs devices ADB branchés — adb reverse appliqué au device par défaut."
    fi
    adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 && echo "✓ adb reverse 8081 (Metro)"
    adb reverse tcp:3000 tcp:3000 >/dev/null 2>&1 && echo "✓ adb reverse 3000 (API locale)"

    if [ "${TOT_LAUNCH_APP:-1}" = "1" ]; then
      adb shell monkey -p com.tot.firetv -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 \
        && echo "✓ App TOT lancée sur le device" \
        || echo "⚠ Impossible de lancer com.tot.firetv (paquet pas installé ?)"
    fi
    echo ""
  fi
fi

export EXPO_PUBLIC_API_BASE_URL="$target"
exec pnpm --filter @tot/firetv start
