#Requires -Version 5.1
#
# TOT — Tractive On TV : "lazy" installer (Windows 10 / 11, PowerShell).
# Same goal as install.sh: every README step from a fresh clone to the APK
# installed on the Fire TV. Each component is detected and the user is
# prompted to install/reinstall/skip.
#
# Usage:
#   PS> .\lazy-scripts\install.ps1
# If blocked by execution policy:
#   PS> powershell -ExecutionPolicy Bypass -File lazy-scripts\install.ps1

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {}

# ─── Colors & helpers ──────────────────────────────────────────────────────
function Write-Header($msg) {
    Write-Host ""
    Write-Host ("=" * 79) -ForegroundColor Magenta
    Write-Host "  $msg" -ForegroundColor Magenta
    Write-Host ("=" * 79) -ForegroundColor Magenta
}
function Write-Step($msg) { Write-Host "> $msg" -ForegroundColor Blue }
function Write-Info($msg) { Write-Host "  $msg" -ForegroundColor DarkGray }
function Write-Ok($msg)   { Write-Host "  [OK] " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Warn($msg) { Write-Host "  [!]  " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Write-Fail($msg) { Write-Host "  [X] " -ForegroundColor Red -NoNewline; Write-Host $msg }
function Stop-Fatal($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

function Confirm-YesNo {
    param([string]$Prompt, [string]$Default = 'N')
    $hint = if ($Default -eq 'Y') { '[Y/n]' } else { '[y/N]' }
    while ($true) {
        Write-Host "  ? " -ForegroundColor Cyan -NoNewline
        $reply = Read-Host "$Prompt $hint"
        if ([string]::IsNullOrWhiteSpace($reply)) { $reply = $Default }
        switch -Regex ($reply.Trim().ToLower()) {
            '^y(es)?$' { return $true }
            '^n(o)?$'  { return $false }
            default    { Write-Host "    Please answer y (yes) or n (no)." }
        }
    }
}

function Read-InputWithDefault {
    param([string]$Prompt, [string]$Default = '')
    $hint = if ($Default) { " (default: $Default)" } else { '' }
    Write-Host "  ? " -ForegroundColor Cyan -NoNewline
    $reply = Read-Host "${Prompt}${hint}"
    if ([string]::IsNullOrEmpty($reply)) { return $Default }
    return $reply
}

function Get-EnvValue($file, $key) {
    if (-not (Test-Path $file)) { return '' }
    foreach ($line in Get-Content $file) {
        if ($line -match "^${key}=(.*)$") { return $Matches[1] }
    }
    return ''
}

function Set-EnvValue($file, $key, $value) {
    $found = $false
    $newLines = @()
    if (Test-Path $file) {
        foreach ($line in Get-Content $file) {
            if ($line -match "^${key}=") {
                $newLines += "${key}=${value}"
                $found = $true
            } else {
                $newLines += $line
            }
        }
    }
    if (-not $found) { $newLines += "${key}=${value}" }
    $content = ($newLines -join "`n") + "`n"
    [System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
}

function Refresh-Path {
    # Refresh the current session PATH from the persisted Machine + User scopes.
    # Useful right after winget installs a tool so we can call it without restarting PowerShell.
    $machine = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    $user    = [Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machine;$user"
}

# ─── Pre-flight ────────────────────────────────────────────────────────────
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $RepoRoot

Write-Header "TOT — Lazy installer (Windows)"
Write-Info  "Project directory: $RepoRoot"
Write-Info  "PowerShell version: $($PSVersionTable.PSVersion)"
Write-Info  "This script will:"
Write-Info  "  1. check/install system tools (winget, git, node, pnpm, jdk17, android sdk)"
Write-Info  "  2. install the repo's pnpm dependencies"
Write-Info  "  3. configure .env.local (Fire TV) and local.properties (Android)"
Write-Info  "  4. deploy the backend to Vercel (CLI or manual)"
Write-Info  "  5. build the release APK"
Write-Info  "  6. install it on your Fire TV via ADB"
Write-Host  ""
Write-Info  "Before you start, make sure you have:"
Write-Info  "  * a MapTiler account (free) - https://cloud.maptiler.com/auth/widget?mode=signup"
Write-Info  "  * a Vercel   account (free) - https://vercel.com/signup"
Write-Info  "  * a Fire TV  with Developer Options + ADB Debugging enabled"
Write-Info  "  * the IP address of your Fire TV (Settings > Network > your network)"
Write-Info  "  * your paid Tractive credentials (used inside the app once installed)"
Write-Info  "The script will pause and prompt you when it needs each of these."
Write-Host  ""
if (-not (Confirm-YesNo "Continue?" "Y")) { Write-Info "Aborted."; exit 0 }

# ─── 1. winget (Windows package manager) ───────────────────────────────────
Write-Step "winget (Windows Package Manager)"
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Ok "winget present: $((winget --version).Trim())"
} else {
    Write-Warn "winget is not available."
    Write-Info "winget ships with Windows 10 1809+ and Windows 11. Install or update 'App Installer' from the Microsoft Store:"
    Write-Info "https://www.microsoft.com/store/productId/9NBLGGH4NNS1"
    Stop-Fatal "winget is required to install the rest of the toolchain."
}

# ─── 2. Git for Windows (provides bash) ────────────────────────────────────
Write-Step "Git for Windows (provides bash, used by the build wrapper)"
function Test-Bash {
    return [bool](Get-Command bash -ErrorAction SilentlyContinue)
}
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok "git present: $(((& git --version) -join ' ').Trim())"
} else {
    Write-Warn "git is not installed."
    if (Confirm-YesNo "Install Git for Windows via winget?" "Y") {
        winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
        Refresh-Path
    } else {
        Stop-Fatal "Git for Windows is required (provides bash for the Gradle build wrapper)."
    }
}
if (-not (Test-Bash)) {
    $gitBash = Join-Path $env:ProgramFiles "Git\bin\bash.exe"
    if (Test-Path $gitBash) {
        $env:PATH = "$env:ProgramFiles\Git\bin;$env:PATH"
        Write-Ok "bash found at $gitBash (added to PATH for this session)."
    } else {
        Write-Warn "bash not on PATH. After Git installs, restart PowerShell and re-run this script."
    }
} else {
    Write-Ok "bash available: $(((& bash --version | Select-Object -First 1)).Trim())"
}

# ─── 3. Node.js 22+ ────────────────────────────────────────────────────────
Write-Step "Node.js (>= 22)"
$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = (& node -v).Trim().TrimStart('v')
    $nodeMajor = [int]($nodeVer.Split('.')[0])
    if ($nodeMajor -ge 22) {
        Write-Ok "node $nodeVer OK"
        $nodeOk = $true
    } else {
        Write-Warn "node $nodeVer too old (need >= 22)."
    }
} else {
    Write-Warn "node is not installed."
}
if (-not $nodeOk) {
    if (Confirm-YesNo "Install Node 22 LTS via winget?" "Y") {
        winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
        Refresh-Path
    } else {
        Stop-Fatal "Node 22+ is required."
    }
} elseif (Confirm-YesNo "Reinstall / upgrade Node?" "N") {
    winget upgrade --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
    Refresh-Path
}

# ─── 4. pnpm 10 (via corepack) ─────────────────────────────────────────────
Write-Step "pnpm 10 (via corepack)"
$pnpmOk = $false
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pnpmVer = (& pnpm -v).Trim()
    $pnpmMajor = [int]($pnpmVer.Split('.')[0])
    if ($pnpmMajor -ge 10) {
        Write-Ok "pnpm $pnpmVer OK"
        $pnpmOk = $true
    } else {
        Write-Warn "pnpm $pnpmVer too old (need >= 10)."
    }
} else {
    Write-Warn "pnpm is not installed."
}
if ((-not $pnpmOk) -or (Confirm-YesNo "Force corepack prepare pnpm@10.33.2?" "N")) {
    & corepack enable
    & corepack prepare pnpm@10.33.2 --activate
    Write-Ok "pnpm $((& pnpm -v).Trim()) activated."
}

# ─── 5. Repo dependencies ──────────────────────────────────────────────────
Write-Step "Monorepo dependencies (pnpm install)"
if (Test-Path (Join-Path $RepoRoot "node_modules")) {
    Write-Ok "node_modules/ already present."
    if (Confirm-YesNo "Run pnpm install again?" "N") { & pnpm install }
} else {
    if (Confirm-YesNo "Run pnpm install?" "Y") {
        & pnpm install
    } else {
        Write-Warn "Without pnpm install, builds will fail."
    }
}

# ─── 6. JDK 17+ ────────────────────────────────────────────────────────────
Write-Step "JDK 17+ (required by Gradle / Android)"
$jdkOk = $false; $jdkPerfect = $false; $jdkMajor = 0; $javaVerLine = ''
if (Get-Command java -ErrorAction SilentlyContinue) {
    $javaVerLine = ((& java -version 2>&1) | Select-Object -First 1).ToString()
    if ($javaVerLine -match 'version "(\d+)') {
        $jdkMajor = [int]$Matches[1]
        if ($jdkMajor -ge 17) {
            $jdkOk = $true
            if ($jdkMajor -eq 17) {
                $jdkPerfect = $true
                Write-Ok "Java 17 detected - $javaVerLine"
            } else {
                Write-Ok "Java $jdkMajor detected - $javaVerLine"
                Write-Info "The project targets JDK 17, but 21 works with AGP 8.5+."
            }
        } else {
            Write-Warn "Java too old (need >= 17) - $javaVerLine"
        }
    }
} else {
    Write-Warn "No Java installation detected."
}
$installJdk17 = $false
if (-not $jdkOk) {
    $installJdk17 = $true
} elseif (-not $jdkPerfect) {
    if (Confirm-YesNo "Also install OpenJDK 17 (the project's official version)?" "N") {
        $installJdk17 = $true
    }
}
if ($installJdk17) {
    if (Confirm-YesNo "Install Microsoft.OpenJDK.17 via winget?" "Y") {
        winget install --id Microsoft.OpenJDK.17 -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
        Refresh-Path
        $jdkInstall = Get-ChildItem "$env:ProgramFiles\Microsoft" -Directory -Filter "jdk-17*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($jdkInstall) {
            $env:JAVA_HOME = $jdkInstall.FullName
            $env:PATH = "$($jdkInstall.FullName)\bin;$env:PATH"
            Write-Ok "JAVA_HOME=$env:JAVA_HOME"
        }
    } elseif (-not $jdkOk) {
        Stop-Fatal "JDK 17+ required to build the APK."
    }
}

# ─── 7. Android SDK (cmdline-tools + platform-tools) ───────────────────────
Write-Step "Android SDK (cmdline-tools + platform-tools)"
$androidHomeDefault = Join-Path $env:LOCALAPPDATA "Android\Sdk"
if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    Write-Ok "ANDROID_HOME=$env:ANDROID_HOME"
} elseif ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    $env:ANDROID_HOME = $env:ANDROID_SDK_ROOT
    Write-Ok "ANDROID_HOME=$env:ANDROID_HOME (from ANDROID_SDK_ROOT)"
} elseif (Test-Path $androidHomeDefault) {
    $env:ANDROID_HOME = $androidHomeDefault
    Write-Ok "ANDROID_HOME=$env:ANDROID_HOME (inferred from Android Studio standard path)"
} else {
    Write-Warn "No Android SDK found."
    Write-Info "Two options:"
    Write-Info "  * Recommended for this lazy install: download cmdline-tools (~150 MB, no GUI)."
    Write-Info "  * Or install Android Studio for the full GUI:"
    Write-Info "      winget install Google.AndroidStudio"
    Write-Info "    then re-run this script after Studio's first-run SDK setup."
    if (Confirm-YesNo "Download Android cmdline-tools now?" "Y") {
        # If this URL ages, grab a fresh one from https://developer.android.com/studio#command-line-tools-only
        $cmdlinetoolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
        $sdkRoot = $androidHomeDefault
        $zipPath = Join-Path $env:TEMP "tot-cmdline-tools.zip"
        $tempExtract = Join-Path $env:TEMP "tot-cmdline-tools-extract"
        Write-Info "Downloading $cmdlinetoolsUrl ..."
        try {
            Invoke-WebRequest -Uri $cmdlinetoolsUrl -OutFile $zipPath -UseBasicParsing
        } catch {
            Stop-Fatal "Download failed: $_"
        }
        Write-Info "Extracting..."
        if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
        Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force
        $targetParent = Join-Path $sdkRoot "cmdline-tools"
        $targetDir = Join-Path $targetParent "latest"
        New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
        if (Test-Path $targetDir) { Remove-Item -Recurse -Force $targetDir }
        Move-Item -Path (Join-Path $tempExtract "cmdline-tools") -Destination $targetDir
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
        $env:ANDROID_HOME = $sdkRoot
        $env:PATH = "$sdkRoot\cmdline-tools\latest\bin;$env:PATH"
        Write-Ok "ANDROID_HOME=$env:ANDROID_HOME"
    } else {
        Stop-Fatal "Android SDK is required. Re-run the script after installing it."
    }
}

# Locate sdkmanager / accept licenses / install platform-tools
$sdkmanager = $null
foreach ($candidate in @(
    "$env:ANDROID_HOME\cmdline-tools\latest\bin\sdkmanager.bat",
    "$env:ANDROID_HOME\cmdline-tools\bin\sdkmanager.bat",
    "$env:ANDROID_HOME\tools\bin\sdkmanager.bat"
)) {
    if (Test-Path $candidate) { $sdkmanager = $candidate; break }
}
if ($sdkmanager) {
    Write-Ok "sdkmanager: $sdkmanager"
    if (Confirm-YesNo "Accept Android SDK licenses (sdkmanager --licenses)?" "Y") {
        # sdkmanager --licenses prompts y/n repeatedly. Pipe enough 'y's.
        $yyy = ("y`n" * 30)
        $yyy | & $sdkmanager --licenses *>&1 | Out-Null
        Write-Ok "Licenses accepted."
    }
    if (-not (Test-Path (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"))) {
        Write-Info "Installing platform-tools via sdkmanager..."
        & $sdkmanager "platform-tools" *>&1 | Out-Null
    }
} else {
    Write-Warn "sdkmanager not found - accept licenses manually if Gradle complains."
}

# ─── 8. ADB ────────────────────────────────────────────────────────────────
Write-Step "adb (Android Debug Bridge)"
if (Get-Command adb -ErrorAction SilentlyContinue) {
    Write-Ok "adb present: $(((& adb --version) | Select-Object -First 1).Trim())"
} elseif (Test-Path (Join-Path $env:ANDROID_HOME "platform-tools\adb.exe")) {
    $env:PATH = "$env:ANDROID_HOME\platform-tools;$env:PATH"
    Write-Ok "adb found in $env:ANDROID_HOME\platform-tools (added to PATH for this session)."
} else {
    Write-Warn "adb not found."
    Write-Info "Re-run sdkmanager to install platform-tools, or download manually:"
    Write-Info "  https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
    Stop-Fatal "adb required to install the APK on Fire TV."
}

# ─── 9. Configure apps/firetv/.env.local (DEV) ─────────────────────────────
Write-Step "Configure apps/firetv/.env.local (DEV mode)"
$FiretvEnv     = Join-Path $RepoRoot "apps\firetv\.env.local"
$FiretvEnvEx   = Join-Path $RepoRoot "apps\firetv\.env.local.exemple"
$FiretvEnvProd = Join-Path $RepoRoot "apps\firetv\.env.production.local"
$FiretvEnvProdEx = Join-Path $RepoRoot "apps\firetv\.env.production.local.exemple"
$MaptilerSignupUrl = "https://cloud.maptiler.com/account/keys/"
Write-Info "Note: .env.local = DEV config (Metro / expo start). The Vercel prod URL"
Write-Info "      is configured later in .env.production.local."

function Read-MaptilerKey($existing) {
    Write-Host ""
    Write-Info "MapTiler - API key required for satellite tiles"
    Write-Info "  1. Create a free account (free tier is enough):"
    Write-Info "     $MaptilerSignupUrl"
    Write-Info "  2. Once logged in, copy the value of the 'Default key' (32 chars)."
    if (Confirm-YesNo "Open the page in your browser now?" "Y") {
        Start-Process $MaptilerSignupUrl
    }
    $key = Read-InputWithDefault "Paste your MapTiler key" $existing
    while (-not $key) {
        Write-Warn "Empty MapTiler key - the app won't be able to render the satellite map."
        if (Confirm-YesNo "Continue without a MapTiler key?" "N") { break }
        $key = Read-InputWithDefault "Paste your MapTiler key" $existing
    }
    return $key
}

$existingApiUrl = Get-EnvValue $FiretvEnv "EXPO_PUBLIC_API_BASE_URL"
$existingMaptiler = Get-EnvValue $FiretvEnv "EXPO_PUBLIC_MAPTILER_KEY"
$existingPsz = Get-EnvValue $FiretvEnv "EXPO_PUBLIC_PSZ_RADIUS_M"
$reconfig = $false

if (Test-Path $FiretvEnv) {
    Write-Ok ".env.local already exists."
    Write-Info "Current contents (DEV):"
    foreach ($line in Get-Content $FiretvEnv) { Write-Info "    $line" }
    if (Confirm-YesNo "Reconfigure .env.local (DEV)?" "N") { $reconfig = $true }
} else {
    Write-Warn ".env.local missing - copying from the example."
    Copy-Item $FiretvEnvEx $FiretvEnv
    $existingApiUrl = Get-EnvValue $FiretvEnv "EXPO_PUBLIC_API_BASE_URL"
    $existingPsz = Get-EnvValue $FiretvEnv "EXPO_PUBLIC_PSZ_RADIUS_M"
    Write-Ok ".env.local created (MapTiler key to fill in below)."
}

$needsMaptiler = $reconfig -or [string]::IsNullOrEmpty($existingMaptiler)

if ($reconfig) {
    $maptilerKey = Read-MaptilerKey $existingMaptiler
    Write-Info "DEV URL: 10.0.2.2:3000 = Android Studio AVD; otherwise use your PC's LAN IP."
    $defaultApi = if ($existingApiUrl) { $existingApiUrl } else { "http://10.0.2.2:3000" }
    $defaultPsz = if ($existingPsz)    { $existingPsz }    else { "25" }
    $apiBaseUrl = Read-InputWithDefault "API URL in DEV mode" $defaultApi
    $pszRadius  = Read-InputWithDefault "Power Saving Zone radius (meters)" $defaultPsz
    $content = @"
EXPO_PUBLIC_API_BASE_URL=$apiBaseUrl
EXPO_PUBLIC_MAPTILER_KEY=$maptilerKey
EXPO_PUBLIC_PSZ_RADIUS_M=$pszRadius
"@
    [System.IO.File]::WriteAllText($FiretvEnv, $content + "`n", [System.Text.UTF8Encoding]::new($false))
    Write-Ok ".env.local written."
} elseif ($needsMaptiler) {
    Write-Warn "EXPO_PUBLIC_MAPTILER_KEY is empty in .env.local."
    $maptilerKey = Read-MaptilerKey ""
    if ($maptilerKey) {
        Set-EnvValue $FiretvEnv "EXPO_PUBLIC_MAPTILER_KEY" $maptilerKey
        Write-Ok ".env.local updated with the MapTiler key."
    }
}

# ─── 10. local.properties (Android Gradle) ─────────────────────────────────
Write-Step "apps/firetv/android/local.properties"
$LocalProps = Join-Path $RepoRoot "apps\firetv\android\local.properties"
$sdkPath = $env:ANDROID_HOME -replace '\\', '/'
if ((Test-Path $LocalProps) -and ((Get-Content $LocalProps) -match '^sdk\.dir=')) {
    $current = (Get-Content $LocalProps | Select-String -Pattern '^sdk\.dir=').Line
    Write-Ok "local.properties OK ($current)."
    if (Confirm-YesNo "Rewrite local.properties?" "N") {
        [System.IO.File]::WriteAllText($LocalProps, "sdk.dir=$sdkPath`n", [System.Text.UTF8Encoding]::new($false))
        Write-Ok "local.properties updated."
    }
} else {
    [System.IO.File]::WriteAllText($LocalProps, "sdk.dir=$sdkPath`n", [System.Text.UTF8Encoding]::new($false))
    Write-Ok "local.properties created with sdk.dir=$sdkPath"
}

# ─── 11. Vercel deployment + .env.production.local ─────────────────────────
Write-Step "Deploy backend to Vercel (URL → .env.production.local)"

$currentProdUrl = Get-EnvValue $FiretvEnvProd "EXPO_PUBLIC_API_BASE_URL"
$skipVercel = $false

if ($currentProdUrl) {
    Write-Info "Current prod URL (.env.production.local): $currentProdUrl"
    if (Confirm-YesNo "Test /api/health on this URL?" "Y") {
        try {
            $resp = Invoke-RestMethod -Uri "$($currentProdUrl.TrimEnd('/'))/api/health" -TimeoutSec 10 -ErrorAction Stop
            if ($resp.status -eq 'ok') {
                Write-Ok "Backend already live and healthy - Vercel step skipped."
                $skipVercel = $true
            } else {
                Write-Warn "Unexpected response. We'll (re)deploy."
            }
        } catch {
            Write-Warn "Healthcheck failed: $_"
        }
    } else {
        $skipVercel = $true
    }
} else {
    Write-Info ".env.production.local missing or EXPO_PUBLIC_API_BASE_URL empty."
}

if (-not $skipVercel) {
    Write-Info "Two options: Vercel CLI (auto, recommended) or manual via vercel.com/new."
    $deployedUrl = $null
    if (Confirm-YesNo "Use the Vercel CLI?" "Y") {
        if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
            Write-Info "Installing the Vercel CLI (via npm, more reliable than pnpm-global on Windows)..."
            & npm install -g vercel
            Refresh-Path
        }
        Write-Info "Vercel login (skipped if you're already authenticated)."
        & vercel whoami 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) { & vercel login }
        Write-Info "Deploying apps/api to production..."
        Push-Location (Join-Path $RepoRoot "apps\api")
        try {
            & vercel --prod --yes
            if ($LASTEXITCODE -ne 0) { Write-Warn "Vercel deployment returned a non-zero status." }
        } finally {
            Pop-Location
        }
        Write-Info "Grab the production URL from the Vercel dashboard or the command output."
        $deployedUrl = Read-InputWithDefault "Paste the production URL (https://...vercel.app)" ""
    } else {
        Write-Info "Open https://vercel.com/new in your browser:"
        Write-Info "  Root Directory: apps/api"
        Write-Info "  Framework:      Next.js (auto-detected)"
        Write-Info "  Install:        (keep the default - runs pnpm install at the monorepo root)"
        Write-Info "Click Deploy and come back here."
        Start-Process "https://vercel.com/new"
        $deployedUrl = Read-InputWithDefault "Paste the production URL once the deployment is done" ""
    }

    if ($deployedUrl) {
        $deployedUrl = $deployedUrl.TrimEnd('/')
        try {
            $resp = Invoke-RestMethod -Uri "$deployedUrl/api/health" -TimeoutSec 10 -ErrorAction Stop
            if ($resp.status -eq 'ok') {
                Write-Ok "Backend reachable: $deployedUrl/api/health -> ok"
            } else {
                Write-Warn "Healthcheck unexpected response. URL kept anyway - verify manually."
            }
        } catch {
            Write-Warn "Healthcheck failed. URL kept anyway - verify manually."
        }
        if (-not (Test-Path $FiretvEnvProd)) {
            if (Test-Path $FiretvEnvProdEx) {
                Copy-Item $FiretvEnvProdEx $FiretvEnvProd
            } else {
                [System.IO.File]::WriteAllText($FiretvEnvProd, "", [System.Text.UTF8Encoding]::new($false))
            }
        }
        Set-EnvValue $FiretvEnvProd "EXPO_PUBLIC_API_BASE_URL" $deployedUrl
        Write-Ok ".env.production.local updated with EXPO_PUBLIC_API_BASE_URL=$deployedUrl"
    } else {
        Write-Warn "No URL provided - the release APK will fall back to the DEV value from .env.local (not reachable from a Fire TV)."
    }
}

# ─── 12. Build APK ─────────────────────────────────────────────────────────
Write-Step "Build the release APK"
$ApkPath = Join-Path $RepoRoot "apps\firetv\android\app\build\outputs\apk\release\app-release.apk"
$doBuild = $false
if (Test-Path $ApkPath) {
    $size = "{0:N1} MB" -f ((Get-Item $ApkPath).Length / 1MB)
    Write-Ok "APK already present: $ApkPath ($size)"
    if (Confirm-YesNo "Rebuild the APK (recommended after editing .env.local)?" "Y") { $doBuild = $true }
} else {
    Write-Info "No existing APK."
    if (Confirm-YesNo "Run the build (10-15 min on first run)?" "Y") { $doBuild = $true }
}
if ($doBuild) {
    & pnpm --filter @tot/firetv build:local
    if ($LASTEXITCODE -ne 0) { Stop-Fatal "Gradle build failed." }
    if (-not (Test-Path $ApkPath)) { Stop-Fatal "Build succeeded but APK not found at $ApkPath" }
    Write-Ok "APK built: $ApkPath"
}

# ─── 13. Install on Fire TV ────────────────────────────────────────────────
Write-Step "Install on Fire TV via ADB"

function Get-AdbDevices {
    $output = & adb devices 2>$null
    $list = @()
    foreach ($line in $output) {
        if ($line -match '^(\S+)\s+device\s*$') {
            $serial = $Matches[1]
            $type = if ($serial -match '^emulator-') { 'emulator' }
                    elseif ($serial -match ':') { 'TCP' }
                    else { 'USB' }
            $manuf = ((& adb -s $serial shell getprop ro.product.manufacturer 2>$null) -join '').Trim()
            $model = ((& adb -s $serial shell getprop ro.product.model 2>$null) -join '').Trim()
            if (-not $manuf) { $manuf = '?' }
            if (-not $model) { $model = '?' }
            $list += [pscustomobject]@{ Serial = $serial; Type = $type; Manufacturer = $manuf; Model = $model }
        }
    }
    return $list
}

if (-not (Test-Path $ApkPath)) {
    Write-Warn "No APK to install. Skipping."
} elseif (-not (Confirm-YesNo "Install the APK on a device?" "Y")) {
    Write-Info "Installation skipped."
} else {
    $devices = @(Get-AdbDevices)   # @() forces array even when 0 or 1 device
    $selectedSerial = $null
    $deviceAction = $null

    if ($devices.Count -gt 0) {
        Write-Info "Devices already connected via ADB:"
        for ($i = 0; $i -lt $devices.Count; $i++) {
            $d = $devices[$i]
            $line = "    [$i] $($d.Serial)`t$($d.Type) "
            if ($d.Manufacturer -in @('Amazon', 'amazon')) {
                Write-Host -NoNewline $line
                Write-Host "(Fire TV) " -ForegroundColor Green -NoNewline
                Write-Host "($($d.Manufacturer) $($d.Model))"
            } elseif ($d.Type -eq 'emulator') {
                Write-Host -NoNewline $line
                Write-Host "(emulator) " -ForegroundColor Yellow -NoNewline
                Write-Host "($($d.Manufacturer) $($d.Model))"
            } else {
                Write-Host "$line ($($d.Manufacturer) $($d.Model))"
            }
        }
        Write-Host "    [n] Connect a new Fire TV by IP"
        Write-Host "    [s] Skip the install step"
        $choice = Read-InputWithDefault "Your choice" "0"
        if ($choice -match '^\d+$' -and [int]$choice -lt $devices.Count) {
            $selectedSerial = $devices[[int]$choice].Serial
            $deviceAction = 'use'
        } elseif ($choice -in @('n','N')) {
            $deviceAction = 'ip'
        } else {
            $deviceAction = 'skip'
        }
    } else {
        Write-Info "No ADB device connected."
        $deviceAction = 'ip'
    }

    if ($deviceAction -eq 'ip') {
        Write-Info "On your Fire TV: Settings -> My Fire TV -> Developer Options ->"
        Write-Info "  * ADB Debugging: ON"
        Write-Info "  * Apps from Unknown Sources: ON"
        Write-Info "The IP is in Settings -> Network -> your network."
        $firetvIp = Read-InputWithDefault "Fire TV IP (e.g. 192.168.1.42)" ""
        if ($firetvIp) {
            Write-Info "adb connect ${firetvIp}:5555 ..."
            & adb connect "${firetvIp}:5555"
            if ($LASTEXITCODE -ne 0) {
                Write-Warn "adb connect returned an error (the TV may be showing an authorization prompt - confirm it)."
            }
            $selectedSerial = "${firetvIp}:5555"
        } else {
            Write-Warn "No IP provided - install skipped."
        }
    }

    if ($selectedSerial) {
        $selManuf = ((& adb -s $selectedSerial shell getprop ro.product.manufacturer 2>$null) -join '').Trim()
        $selModel = ((& adb -s $selectedSerial shell getprop ro.product.model 2>$null) -join '').Trim()
        if (-not $selManuf) { $selManuf = '?' }
        if (-not $selModel) { $selModel = '?' }
        Write-Info "Target: $selectedSerial - $selManuf $selModel"
        $isFiretv = $selManuf -in @('Amazon', 'amazon')
        if (-not $isFiretv) {
            if ($selectedSerial -match '^emulator-') {
                Write-Warn "This is an Android EMULATOR, not a physical Fire TV."
            } else {
                Write-Warn "Manufacturer = '$selManuf' - target is not a Fire TV (Amazon)."
            }
            if (-not (Confirm-YesNo "Install anyway?" "N")) {
                $selectedSerial = $null
            }
        }
    }

    if ($selectedSerial) {
        Write-Info "Installing the APK..."
        & adb -s $selectedSerial install -r $ApkPath
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "APK installed on $selectedSerial"
            if (Confirm-YesNo "Launch the app immediately?" "Y") {
                $buildGradle = Join-Path $RepoRoot "apps\firetv\android\app\build.gradle"
                $pkg = $null
                if (Test-Path $buildGradle) {
                    foreach ($line in Get-Content $buildGradle) {
                        if ($line -match "applicationId\s+['""]([^'""]+)['""]") {
                            $pkg = $Matches[1]
                            break
                        }
                    }
                }
                if ($pkg) {
                    & adb -s $selectedSerial shell monkey -p $pkg -c android.intent.category.LAUNCHER 1 *>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Ok "App launched."
                    } else {
                        Write-Warn "Could not launch the app - start it from the home screen."
                    }
                } else {
                    Write-Warn "applicationId not detected - launch the app manually."
                }
            }
        } else {
            Write-Fail "Install failed. Make sure the TV accepted the ADB authorization."
        }
    }
}

# ─── Summary ───────────────────────────────────────────────────────────────
Write-Header "Done"
Write-Ok "Toolchain installed and project configured."
Write-Info "Release APK: $ApkPath"
Write-Info "Files to keep:"
Write-Info "  * apps/firetv/.env.local             (DEV config: MapTiler + local URL)"
Write-Info "  * apps/firetv/.env.production.local  (Vercel URL - release overlay)"
Write-Info "  * apps/firetv/android/local.properties"
Write-Info "To rebuild/reinstall later:"
Write-Info "  pnpm --filter @tot/firetv build:local"
Write-Info "  pnpm --filter @tot/firetv install:tv"
Write-Host ""
