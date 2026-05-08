#!/usr/bin/env bash
# TOT — Tractive On TV : "lazy" installer (macOS).
# Runs every README step from a fresh clone all the way to the APK installed
# on the Fire TV. Each component is detected, and the user is prompted to
# install/reinstall/skip.
#
# Usage:
#   bash lazy-scripts/install.sh
#   ./lazy-scripts/install.sh   (after chmod +x)

set -uo pipefail

# ─── Colors & helpers ──────────────────────────────────────────────────────
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
    C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
    C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YEL=$'\033[33m'
    C_BLU=$'\033[34m'; C_MAG=$'\033[35m'; C_CYN=$'\033[36m'
else
    C_RESET=""; C_BOLD=""; C_DIM=""
    C_RED=""; C_GRN=""; C_YEL=""; C_BLU=""; C_MAG=""; C_CYN=""
fi

header() {
    echo
    echo "${C_BOLD}${C_MAG}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"
    echo "${C_BOLD}${C_MAG}  $*${C_RESET}"
    echo "${C_BOLD}${C_MAG}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C_RESET}"
}
step()    { echo "${C_BOLD}${C_BLU}▶${C_RESET} ${C_BOLD}$*${C_RESET}"; }
info()    { echo "  ${C_DIM}$*${C_RESET}"; }
ok()      { echo "  ${C_GRN}✓${C_RESET} $*"; }
warn()    { echo "  ${C_YEL}⚠${C_RESET}  $*"; }
fail()    { echo "  ${C_RED}✗${C_RESET} $*"; }
fatal()   { echo "${C_RED}${C_BOLD}ERROR:${C_RESET} $*" >&2; exit 1; }

ask_yes_no() {
    # $1 = prompt, $2 = default Y or N (default: N)
    local prompt="$1" default="${2:-N}" hint reply
    if [[ "$default" == "Y" ]]; then hint="[Y/n]"; else hint="[y/N]"; fi
    while true; do
        printf "  ${C_CYN}?${C_RESET} %s %s " "$prompt" "$hint"
        read -r reply || reply=""
        reply="${reply:-$default}"
        case "$reply" in
            [Yy]|[Yy][Ee][Ss]) return 0 ;;
            [Nn]|[Nn][Oo])     return 1 ;;
            *) echo "    Please answer y (yes) or n (no)." ;;
        esac
    done
}

ask_input() {
    # $1 = prompt, $2 = default value (optional)
    local prompt="$1" default="${2:-}" reply hint=""
    [[ -n "$default" ]] && hint=" (default: ${default})"
    printf "  ${C_CYN}?${C_RESET} %s%s: " "$prompt" "$hint"
    read -r reply || reply=""
    echo "${reply:-$default}"
}

# ─── Pre-flight ────────────────────────────────────────────────────────────
[[ "$(uname -s)" == "Darwin" ]] || fatal "This script targets macOS only."

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ARCH="$(uname -m)"
if [[ "$ARCH" == "arm64" ]]; then
    BREW_PREFIX="/opt/homebrew"
else
    BREW_PREFIX="/usr/local"
fi

header "TOT — Lazy installer"
info "Project directory: ${REPO_ROOT}"
info "Architecture: ${ARCH}  •  Expected Homebrew prefix: ${BREW_PREFIX}"
info "This script will:"
info "  1. check/install system tools (brew, node, pnpm, jdk17, android sdk)"
info "  2. install the repo's pnpm dependencies"
info "  3. configure .env.local (Fire TV) and local.properties (Android)"
info "  4. deploy the backend to Vercel (CLI or manual)"
info "  5. build the release APK"
info "  6. install it on your Fire TV via ADB"
echo
info "${C_BOLD}Before you start, make sure you have:${C_RESET}"
info "  • a ${C_BOLD}MapTiler${C_RESET} account (free) — https://cloud.maptiler.com/auth/widget?mode=signup"
info "  • a ${C_BOLD}Vercel${C_RESET}   account (free) — https://vercel.com/signup"
info "  • a ${C_BOLD}Fire TV${C_RESET}  with Developer Options + ADB Debugging enabled"
info "  • the ${C_BOLD}IP address${C_RESET} of your Fire TV (Settings → Network → your network)"
info "  • your ${C_BOLD}paid Tractive${C_RESET} credentials (used inside the app once installed)"
info "The script will pause and prompt you when it needs each of these."
echo
ask_yes_no "Continue?" "Y" || { info "Aborted."; exit 0; }

# ─── 1. Homebrew ───────────────────────────────────────────────────────────
step "Homebrew"
if command -v brew >/dev/null 2>&1; then
    ok "brew present: $(brew --version | head -1)"
else
    warn "Homebrew is not installed."
    if ask_yes_no "Install Homebrew now (official script)?" "Y"; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        eval "$("$BREW_PREFIX/bin/brew" shellenv)"
    else
        fatal "Homebrew is required to continue."
    fi
fi

# ─── 2. Node.js 22+ ────────────────────────────────────────────────────────
step "Node.js (>= 22)"
NODE_OK=false
if command -v node >/dev/null 2>&1; then
    NODE_VER="$(node -v | sed 's/v//')"
    NODE_MAJOR="${NODE_VER%%.*}"
    if [[ "$NODE_MAJOR" -ge 22 ]]; then
        ok "node $NODE_VER OK"
        NODE_OK=true
    else
        warn "node $NODE_VER too old (need >= 22)."
    fi
else
    warn "node is not installed."
fi
if ! $NODE_OK; then
    if ask_yes_no "Install Node 22 via brew?" "Y"; then
        brew install node@22
        brew link --overwrite --force node@22
    else
        fatal "Node 22+ is required."
    fi
elif ask_yes_no "Reinstall / upgrade Node?" "N"; then
    brew upgrade node@22 2>/dev/null || brew install node@22
fi

# ─── 3. pnpm 10 (via corepack) ─────────────────────────────────────────────
step "pnpm 10 (via corepack)"
PNPM_OK=false
if command -v pnpm >/dev/null 2>&1; then
    PNPM_VER="$(pnpm -v 2>/dev/null || echo 0.0.0)"
    PNPM_MAJOR="${PNPM_VER%%.*}"
    if [[ "$PNPM_MAJOR" -ge 10 ]]; then
        ok "pnpm $PNPM_VER OK"
        PNPM_OK=true
    else
        warn "pnpm $PNPM_VER too old (need >= 10)."
    fi
else
    warn "pnpm is not installed."
fi
if ! $PNPM_OK || ask_yes_no "Force corepack prepare pnpm@10.33.2?" "N"; then
    corepack enable
    corepack prepare pnpm@10.33.2 --activate
    ok "pnpm $(pnpm -v) activated."
fi

# ─── 4. Repo dependencies ──────────────────────────────────────────────────
step "Monorepo dependencies (pnpm install)"
if [[ -d "$REPO_ROOT/node_modules" ]]; then
    ok "node_modules/ already present."
    if ask_yes_no "Run pnpm install again?" "N"; then
        pnpm install
    fi
else
    if ask_yes_no "Run pnpm install?" "Y"; then
        pnpm install
    else
        warn "Without pnpm install, builds will fail."
    fi
fi

# ─── 5. JDK 17+ ────────────────────────────────────────────────────────────
step "JDK 17+ (required by Gradle / Android)"
JDK_OK=false
JDK_PERFECT=false
JDK_MAJOR=0
if command -v java >/dev/null 2>&1; then
    JAVA_VER_LINE="$(java -version 2>&1 | head -1)"
    # Extract the major from "openjdk version "21.0.10"" or "java version "17.0.12""
    JDK_MAJOR="$(echo "$JAVA_VER_LINE" | sed -nE 's/.*version "([0-9]+).*/\1/p')"
    if [[ -n "$JDK_MAJOR" && "$JDK_MAJOR" -ge 17 ]]; then
        JDK_OK=true
        if [[ "$JDK_MAJOR" -eq 17 ]]; then
            JDK_PERFECT=true
            ok "Java 17 detected — $JAVA_VER_LINE"
        else
            ok "Java $JDK_MAJOR detected — $JAVA_VER_LINE"
            info "The project targets JDK 17, but 21 works with AGP 8.5+."
        fi
    else
        warn "Java too old (need >= 17) — $JAVA_VER_LINE"
    fi
else
    warn "No Java installation detected."
fi

INSTALL_JDK17=false
if ! $JDK_OK; then
    INSTALL_JDK17=true
elif ! $JDK_PERFECT; then
    if ask_yes_no "Also install openjdk@17 (the project's official version)?" "N"; then
        INSTALL_JDK17=true
    fi
fi

if $INSTALL_JDK17; then
    if ask_yes_no "Install openjdk@17 via brew?" "Y"; then
        brew install openjdk@17
        sudo ln -sfn "$BREW_PREFIX/opt/openjdk@17/libexec/openjdk.jdk" \
            /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null \
            || warn "/Library/Java symlink not created (sudo declined). Not blocking if JAVA_HOME points elsewhere."
        export JAVA_HOME="$BREW_PREFIX/opt/openjdk@17"
        export PATH="$JAVA_HOME/bin:$PATH"
        ok "JAVA_HOME=$JAVA_HOME"
    elif ! $JDK_OK; then
        fatal "JDK 17+ required to build the APK."
    fi
fi

# ─── 6. Android SDK ────────────────────────────────────────────────────────
step "Android SDK (cmdline-tools + platform-tools)"
ANDROID_HOME_DEFAULT="$HOME/Library/Android/sdk"
if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]]; then
    ok "ANDROID_HOME=$ANDROID_HOME"
elif [[ -n "${ANDROID_SDK_ROOT:-}" && -d "$ANDROID_SDK_ROOT" ]]; then
    export ANDROID_HOME="$ANDROID_SDK_ROOT"
    ok "ANDROID_HOME=$ANDROID_HOME (from ANDROID_SDK_ROOT)"
elif [[ -d "$ANDROID_HOME_DEFAULT" ]]; then
    export ANDROID_HOME="$ANDROID_HOME_DEFAULT"
    ok "ANDROID_HOME=$ANDROID_HOME (inferred from the standard Android Studio path)"
else
    warn "No Android SDK found."
    info "Two options:"
    info "  • Recommended for this lazy install: brew cask 'android-commandlinetools'"
    info "    (~200 MB, no GUI — exactly what we need to build the APK)."
    info "  • Or install Android Studio (https://developer.android.com/studio) for the full GUI,"
    info "    then re-run this script."
    if ask_yes_no "Install brew cask 'android-commandlinetools' now?" "Y"; then
        brew install --cask android-commandlinetools
        export ANDROID_HOME="$BREW_PREFIX/share/android-commandlinetools"
        ok "ANDROID_HOME=$ANDROID_HOME"
    else
        fatal "Android SDK is required. Re-run the script after installing it."
    fi
fi

# Check sdkmanager / accept licenses if available
SDKMANAGER=""
for candidate in \
    "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" \
    "$ANDROID_HOME/cmdline-tools/bin/sdkmanager" \
    "$ANDROID_HOME/tools/bin/sdkmanager"; do
    [[ -x "$candidate" ]] && SDKMANAGER="$candidate" && break
done
if [[ -n "$SDKMANAGER" ]]; then
    ok "sdkmanager: $SDKMANAGER"
    if ask_yes_no "Accept Android SDK licenses (sdkmanager --licenses)?" "N"; then
        yes | "$SDKMANAGER" --licenses >/dev/null || warn "License acceptance partially failed."
    fi
else
    warn "sdkmanager not found — accept licenses manually if Gradle complains."
fi

# ─── 7. ADB (platform-tools) ───────────────────────────────────────────────
step "adb (Android Debug Bridge)"
if command -v adb >/dev/null 2>&1; then
    ok "adb present: $(adb --version | head -1)"
elif [[ -x "$ANDROID_HOME/platform-tools/adb" ]]; then
    export PATH="$ANDROID_HOME/platform-tools:$PATH"
    ok "adb found in $ANDROID_HOME/platform-tools (added to PATH for this session)."
else
    warn "adb not found."
    if ask_yes_no "Install platform-tools (brew cask)?" "Y"; then
        brew install --cask android-platform-tools
    else
        fatal "adb required to install the APK on Fire TV."
    fi
fi

# ─── 8. Configure apps/firetv/.env.local (DEV) ─────────────────────────────
step "Configure apps/firetv/.env.local (DEV mode)"
FIRETV_ENV="$REPO_ROOT/apps/firetv/.env.local"
FIRETV_ENV_EX="$REPO_ROOT/apps/firetv/.env.local.exemple"
FIRETV_ENV_PROD="$REPO_ROOT/apps/firetv/.env.production.local"
FIRETV_ENV_PROD_EX="$REPO_ROOT/apps/firetv/.env.production.local.exemple"
MAPTILER_SIGNUP_URL="https://cloud.maptiler.com/account/keys/"
info "Note: .env.local = DEV config (Metro / expo start). The Vercel prod URL"
info "      is configured later in .env.production.local."

prompt_maptiler_key() {
    local existing="${1:-}"
    echo
    info "${C_BOLD}MapTiler${C_RESET}${C_DIM} — API key required for satellite tiles${C_RESET}"
    info "  1. Create a free account (free tier is enough):"
    info "     ${C_BOLD}${MAPTILER_SIGNUP_URL}${C_RESET}"
    info "  2. Once logged in, copy the value of the 'Default key' (32 chars)."
    if ask_yes_no "Open the page in your browser now?" "Y"; then
        open "$MAPTILER_SIGNUP_URL" 2>/dev/null || warn "Could not open the browser. Visit the URL above manually."
    fi
    local key
    key="$(ask_input "Paste your MapTiler key" "$existing")"
    while [[ -z "$key" ]]; do
        warn "Empty MapTiler key — the app won't be able to render the satellite map."
        if ask_yes_no "Continue without a MapTiler key?" "N"; then break; fi
        key="$(ask_input "Paste your MapTiler key" "$existing")"
    done
    echo "$key"
}

# Load existing values if .env.local is there
EXISTING_API_URL=""
EXISTING_MAPTILER=""
EXISTING_PSZ=""
if [[ -f "$FIRETV_ENV" ]]; then
    EXISTING_API_URL="$(grep '^EXPO_PUBLIC_API_BASE_URL=' "$FIRETV_ENV" | cut -d= -f2- || true)"
    EXISTING_MAPTILER="$(grep '^EXPO_PUBLIC_MAPTILER_KEY=' "$FIRETV_ENV" | cut -d= -f2- || true)"
    EXISTING_PSZ="$(grep '^EXPO_PUBLIC_PSZ_RADIUS_M=' "$FIRETV_ENV" | cut -d= -f2- || true)"
    ok ".env.local already exists."
    info "Current contents (DEV):"
    sed 's/^/    /' "$FIRETV_ENV"
    RECONFIG=false
    if ask_yes_no "Reconfigure .env.local (DEV)?" "N"; then RECONFIG=true; fi
else
    warn ".env.local missing — copying from the example."
    cp "$FIRETV_ENV_EX" "$FIRETV_ENV"
    EXISTING_API_URL="$(grep '^EXPO_PUBLIC_API_BASE_URL=' "$FIRETV_ENV" | cut -d= -f2- || true)"
    EXISTING_PSZ="$(grep '^EXPO_PUBLIC_PSZ_RADIUS_M=' "$FIRETV_ENV" | cut -d= -f2- || true)"
    ok ".env.local created (MapTiler key to fill in below)."
    RECONFIG=false
fi

# Case: full reconfig OR empty MapTiler key → prompt
NEEDS_MAPTILER=false
if $RECONFIG || [[ -z "$EXISTING_MAPTILER" ]]; then
    NEEDS_MAPTILER=true
fi

if $RECONFIG; then
    MAPTILER_KEY="$(prompt_maptiler_key "$EXISTING_MAPTILER")"
    info "DEV URL: 10.0.2.2:3000 = Android Studio AVD; otherwise use your Mac's LAN IP."
    API_BASE_URL="$(ask_input "API URL in DEV mode" "${EXISTING_API_URL:-http://10.0.2.2:3000}")"
    PSZ_RADIUS="$(ask_input "Power Saving Zone radius (meters)" "${EXISTING_PSZ:-25}")"
    cat > "$FIRETV_ENV" <<EOF
EXPO_PUBLIC_API_BASE_URL=${API_BASE_URL}
EXPO_PUBLIC_MAPTILER_KEY=${MAPTILER_KEY}
EXPO_PUBLIC_PSZ_RADIUS_M=${PSZ_RADIUS}
EOF
    ok ".env.local written."
elif $NEEDS_MAPTILER; then
    warn "EXPO_PUBLIC_MAPTILER_KEY is empty in .env.local."
    MAPTILER_KEY="$(prompt_maptiler_key "")"
    if [[ -n "$MAPTILER_KEY" ]]; then
        tmpfile="$(mktemp)"
        if grep -q '^EXPO_PUBLIC_MAPTILER_KEY=' "$FIRETV_ENV"; then
            sed "s|^EXPO_PUBLIC_MAPTILER_KEY=.*|EXPO_PUBLIC_MAPTILER_KEY=${MAPTILER_KEY}|" "$FIRETV_ENV" > "$tmpfile"
            mv "$tmpfile" "$FIRETV_ENV"
        else
            echo "EXPO_PUBLIC_MAPTILER_KEY=${MAPTILER_KEY}" >> "$FIRETV_ENV"
        fi
        ok ".env.local updated with the MapTiler key."
    fi
fi

# ─── 9. local.properties (Android Gradle) ──────────────────────────────────
step "apps/firetv/android/local.properties"
LOCAL_PROPS="$REPO_ROOT/apps/firetv/android/local.properties"
if [[ -f "$LOCAL_PROPS" ]] && grep -q '^sdk.dir=' "$LOCAL_PROPS"; then
    ok "local.properties OK ($(grep '^sdk.dir=' "$LOCAL_PROPS"))."
    if ask_yes_no "Rewrite local.properties?" "N"; then
        echo "sdk.dir=$ANDROID_HOME" > "$LOCAL_PROPS"
        ok "local.properties updated."
    fi
else
    echo "sdk.dir=$ANDROID_HOME" > "$LOCAL_PROPS"
    ok "local.properties created with sdk.dir=$ANDROID_HOME"
fi

# ─── 10. Vercel deployment + .env.production.local ─────────────────────────
step "Deploy backend to Vercel (URL → .env.production.local)"

CURRENT_PROD_URL=""
if [[ -f "$FIRETV_ENV_PROD" ]]; then
    CURRENT_PROD_URL="$(grep '^EXPO_PUBLIC_API_BASE_URL=' "$FIRETV_ENV_PROD" | cut -d= -f2- || true)"
fi

SKIP_VERCEL=false
if [[ -n "$CURRENT_PROD_URL" ]]; then
    info "Current prod URL (.env.production.local): $CURRENT_PROD_URL"
    if ask_yes_no "Test /api/health on this URL?" "Y"; then
        if curl -fsS "${CURRENT_PROD_URL%/}/api/health" | grep -q '"ok"'; then
            ok "Backend already live and healthy — Vercel step skipped."
            SKIP_VERCEL=true
        else
            warn "Unexpected response. We'll (re)deploy."
        fi
    else
        SKIP_VERCEL=true
    fi
else
    info ".env.production.local missing or EXPO_PUBLIC_API_BASE_URL empty."
fi

if ! $SKIP_VERCEL; then
    info "Two options: Vercel CLI (auto, recommended) or manual via vercel.com/new."
    if ask_yes_no "Use the Vercel CLI?" "Y"; then
        if ! command -v vercel >/dev/null 2>&1; then
            info "Installing the Vercel CLI..."
            pnpm add -g vercel || npm i -g vercel
        fi
        info "Vercel login (skipped if you're already authenticated)."
        vercel whoami >/dev/null 2>&1 || vercel login
        info "Deploying apps/api to production..."
        ( cd "$REPO_ROOT/apps/api" && vercel --prod --yes ) || warn "Vercel deployment returned a non-zero status."
        info "Grab the production URL from the Vercel dashboard or the command output."
        DEPLOYED_URL="$(ask_input "Paste the production URL (https://...vercel.app)" "")"
    else
        info "Open https://vercel.com/new in your browser:"
        info "  Root Directory: apps/api"
        info "  Framework:      Next.js (auto-detected)"
        info "  Install:        (keep the default — runs pnpm install at the monorepo root)"
        info "Click Deploy and come back here."
        open "https://vercel.com/new" 2>/dev/null || true
        DEPLOYED_URL="$(ask_input "Paste the production URL once the deployment is done" "")"
    fi

    if [[ -n "$DEPLOYED_URL" ]]; then
        DEPLOYED_URL="${DEPLOYED_URL%/}"
        if curl -fsS "$DEPLOYED_URL/api/health" | grep -q '"ok"'; then
            ok "Backend reachable: $DEPLOYED_URL/api/health → ok"
        else
            warn "Healthcheck failed. URL kept anyway — verify manually."
        fi
        # Write to .env.production.local (create from example if missing)
        if [[ ! -f "$FIRETV_ENV_PROD" ]]; then
            if [[ -f "$FIRETV_ENV_PROD_EX" ]]; then
                cp "$FIRETV_ENV_PROD_EX" "$FIRETV_ENV_PROD"
            else
                : > "$FIRETV_ENV_PROD"
            fi
        fi
        if grep -q '^EXPO_PUBLIC_API_BASE_URL=' "$FIRETV_ENV_PROD"; then
            tmpfile="$(mktemp)"
            sed "s|^EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=${DEPLOYED_URL}|" "$FIRETV_ENV_PROD" > "$tmpfile"
            mv "$tmpfile" "$FIRETV_ENV_PROD"
        else
            echo "EXPO_PUBLIC_API_BASE_URL=${DEPLOYED_URL}" >> "$FIRETV_ENV_PROD"
        fi
        ok ".env.production.local updated with EXPO_PUBLIC_API_BASE_URL=${DEPLOYED_URL}"
    else
        warn "No URL provided — the release APK will fall back to the DEV value from .env.local (not reachable from a Fire TV)."
    fi
fi

# ─── 11. Build APK ─────────────────────────────────────────────────────────
step "Build the release APK"
APK_PATH="$REPO_ROOT/apps/firetv/android/app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK_PATH" ]]; then
    ok "APK already present: $APK_PATH ($(du -h "$APK_PATH" | cut -f1))"
    if ask_yes_no "Rebuild the APK (recommended after editing .env.local)?" "Y"; then
        DO_BUILD=true
    else
        DO_BUILD=false
    fi
else
    info "No existing APK."
    if ask_yes_no "Run the build (10-15 min on first run)?" "Y"; then
        DO_BUILD=true
    else
        DO_BUILD=false
    fi
fi
if $DO_BUILD; then
    pnpm --filter @tot/firetv build:local || fatal "Gradle build failed."
    [[ -f "$APK_PATH" ]] || fatal "Build succeeded but APK not found at $APK_PATH"
    ok "APK built: $APK_PATH"
fi

# ─── 12. Install on Fire TV ────────────────────────────────────────────────
step "Install on Fire TV via ADB"

# List connected devices as: serial|type|manufacturer|model
list_adb_devices() {
    adb devices 2>/dev/null | awk '$2=="device" {print $1}' | while IFS= read -r serial; do
        local type
        case "$serial" in
            emulator-*) type="emulator" ;;
            *:*)        type="TCP" ;;
            *)          type="USB" ;;
        esac
        local manuf model
        manuf="$(adb -s "$serial" shell getprop ro.product.manufacturer 2>/dev/null | tr -d '\r')"
        model="$(adb -s "$serial" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
        printf '%s|%s|%s|%s\n' "$serial" "$type" "${manuf:-?}" "${model:-?}"
    done
}

if [[ ! -f "$APK_PATH" ]]; then
    warn "No APK to install. Skipping."
elif ! ask_yes_no "Install the APK on a device?" "Y"; then
    info "Installation skipped."
else
    DEVICES=()
    while IFS= read -r line; do
        [[ -n "$line" ]] && DEVICES+=("$line")
    done < <(list_adb_devices)

    SELECTED_SERIAL=""
    DEVICE_ACTION=""

    if [[ ${#DEVICES[@]} -gt 0 ]]; then
        info "Devices already connected via ADB:"
        idx=0
        for dev in "${DEVICES[@]}"; do
            IFS='|' read -r d_serial d_type d_manuf d_model <<< "$dev"
            tag="$d_type"
            if [[ "$d_manuf" == "Amazon" || "$d_manuf" == "amazon" ]]; then
                tag="${tag} • ${C_GRN}Fire TV${C_RESET}"
            elif [[ "$d_type" == "emulator" ]]; then
                tag="${C_YEL}${tag}${C_RESET}"
            fi
            printf "    [%d] %-22s  %s  (%s %s)\n" "$idx" "$d_serial" "$tag" "$d_manuf" "$d_model"
            idx=$((idx+1))
        done
        echo "    [n] Connect a new Fire TV by IP"
        echo "    [s] Skip the install step"
        choice="$(ask_input "Your choice" "0")"
        if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -lt ${#DEVICES[@]} ]]; then
            IFS='|' read -r SELECTED_SERIAL _ _ _ <<< "${DEVICES[$choice]}"
            DEVICE_ACTION="use"
        elif [[ "$choice" == "n" || "$choice" == "N" ]]; then
            DEVICE_ACTION="ip"
        else
            DEVICE_ACTION="skip"
        fi
    else
        info "No ADB device connected."
        DEVICE_ACTION="ip"
    fi

    if [[ "$DEVICE_ACTION" == "ip" ]]; then
        info "On your Fire TV: Settings → My Fire TV → Developer Options →"
        info "  • ADB Debugging: ON"
        info "  • Apps from Unknown Sources: ON"
        info "The IP is in Settings → Network → your network."
        if command -v dns-sd >/dev/null 2>&1; then
            info "Tip: 'dns-sd -B _adb._tcp local.' (separate terminal) lists Fire TVs advertising via mDNS on your LAN."
        fi
        FIRETV_IP="$(ask_input "Fire TV IP (e.g. 192.168.1.42)" "")"
        if [[ -n "$FIRETV_IP" ]]; then
            info "adb connect ${FIRETV_IP}:5555 ..."
            adb connect "${FIRETV_IP}:5555" \
                || warn "adb connect returned an error (the TV may be showing an authorization prompt — confirm it)."
            SELECTED_SERIAL="${FIRETV_IP}:5555"
        else
            warn "No IP provided — install skipped."
        fi
    fi

    # Warn if the target isn't a Fire TV
    if [[ -n "$SELECTED_SERIAL" ]]; then
        SEL_MANUF="$(adb -s "$SELECTED_SERIAL" shell getprop ro.product.manufacturer 2>/dev/null | tr -d '\r')"
        SEL_MODEL="$(adb -s "$SELECTED_SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
        info "Target: ${SELECTED_SERIAL} — ${SEL_MANUF:-?} ${SEL_MODEL:-?}"
        is_firetv=false
        [[ "$SEL_MANUF" == "Amazon" || "$SEL_MANUF" == "amazon" ]] && is_firetv=true
        if ! $is_firetv; then
            if [[ "$SELECTED_SERIAL" == emulator-* ]]; then
                warn "This is an Android EMULATOR, not a physical Fire TV."
            else
                warn "Manufacturer = '${SEL_MANUF:-unknown}' — target is not a Fire TV (Amazon)."
            fi
            if ! ask_yes_no "Install anyway?" "N"; then
                SELECTED_SERIAL=""
            fi
        fi
    fi

    if [[ -n "$SELECTED_SERIAL" ]]; then
        info "Installing the APK..."
        if adb -s "$SELECTED_SERIAL" install -r "$APK_PATH"; then
            ok "APK installed on $SELECTED_SERIAL"
            if ask_yes_no "Launch the app immediately?" "Y"; then
                PKG="$(grep -oE "applicationId[[:space:]]+['\"][^'\"]+['\"]" "$REPO_ROOT/apps/firetv/android/app/build.gradle" | head -1 | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/")"
                if [[ -n "$PKG" ]]; then
                    if adb -s "$SELECTED_SERIAL" shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; then
                        ok "App launched."
                    else
                        warn "Could not launch the app — start it from the home screen."
                    fi
                else
                    warn "applicationId not detected — launch the app manually."
                fi
            fi
        else
            fail "Install failed. Make sure the TV accepted the ADB authorization."
        fi
    fi
fi

# ─── Summary ───────────────────────────────────────────────────────────────
header "Done"
ok "Toolchain installed and project configured."
info "Release APK: $APK_PATH"
info "Files to keep:"
info "  • apps/firetv/.env.local             (DEV config: MapTiler + local URL)"
info "  • apps/firetv/.env.production.local  (Vercel URL — release overlay)"
info "  • apps/firetv/android/local.properties"
info "To rebuild/reinstall later:"
info "  pnpm --filter @tot/firetv build:local"
info "  pnpm --filter @tot/firetv install:tv"
echo
