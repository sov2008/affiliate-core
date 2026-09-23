# ==============================================================================
# run-fcc.ps1 - Free Claude Code (FCC) Project Launcher
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$FccArgs
)

# 1. Automatic navigation to project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
Write-Host "[FCC] Working directory: $ProjectRoot" -ForegroundColor Cyan

# 2. Configure UTF-8 encoding for CLI output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING     = "utf-8"

# 3. Disable QuickEdit / Mark Mode (prevents console freeze on accidental text click)
try {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    public class ConsoleModeHelper {
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
        public const int STD_INPUT_HANDLE = -10;
        public const uint ENABLE_QUICK_EDIT_MODE = 0x0040;
        public const uint ENABLE_EXTENDED_FLAGS = 0x0080;
        public static void DisableQuickEdit() {
            IntPtr handle = GetStdHandle(STD_INPUT_HANDLE);
            uint mode;
            if (GetConsoleMode(handle, out mode)) {
                mode &= ~ENABLE_QUICK_EDIT_MODE;
                mode |= ENABLE_EXTENDED_FLAGS;
                SetConsoleMode(handle, mode);
            }
        }
    }
"@ -ErrorAction SilentlyContinue
    [ConsoleModeHelper]::DisableQuickEdit()
} catch {
    # Non-critical: continue if kernel32 is not accessible
}

# 4. Ensure ~/.local/bin is in PATH
$LocalBin = Join-Path $env:USERPROFILE ".local\bin"
if ($env:PATH -notlike "*$LocalBin*") {
    $env:PATH = "$LocalBin;$env:PATH"
}

# 5. Check network connectivity
Write-Host "[FCC] Checking network connectivity..." -NoNewline
$NetworkOk = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect("1.1.1.1", 443, $null, $null)
    $success = $iar.AsyncWaitHandle.WaitOne(2000, $false)
    if ($success) {
        $tcp.EndConnect($iar)
        $NetworkOk = $true
    }
    $tcp.Close()
} catch {
    $NetworkOk = $false
}

if ($NetworkOk) {
    Write-Host " OK (Internet reachable)" -ForegroundColor Green
} else {
    Write-Host " WARNING: Gateway 1.1.1.1 unreachable, checking DNS/HTTP..." -ForegroundColor Yellow
    try {
        $testHttp = Test-Connection -ComputerName "openrouter.ai" -Count 1 -Quiet -ErrorAction SilentlyContinue
        if ($testHttp) {
            Write-Host " OK (openrouter.ai reachable)" -ForegroundColor Green
        } else {
            Write-Host " [!] Possible network issue or VPN required." -ForegroundColor Red
        }
    } catch {
        Write-Host " [!] Network check error: $_" -ForegroundColor Red
    }
}

# 6. Check and auto-start local FCC proxy server (port 8082)
$FccServerUrl = "http://127.0.0.1:8082"
$ServerHealthy = $false
try {
    $healthResp = Invoke-RestMethod -Uri "$FccServerUrl/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    if ($healthResp.status -eq "healthy") {
        $ServerHealthy = $true
    }
} catch {
    $ServerHealthy = $false
}

if (-not $ServerHealthy) {
    Write-Host "[FCC] FCC server not running on $FccServerUrl. Starting fcc-server..." -ForegroundColor Yellow
    Start-Process "fcc-server" -WindowStyle Hidden
    $attempts = 0
    while ($attempts -lt 10 -and -not $ServerHealthy) {
        Start-Sleep -Milliseconds 500
        $attempts++
        try {
            $h = Invoke-RestMethod -Uri "$FccServerUrl/health" -Method Get -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($h.status -eq "healthy") {
                $ServerHealthy = $true
            }
        } catch { }
    }
    if ($ServerHealthy) {
        Write-Host "[FCC] FCC server started successfully!" -ForegroundColor Green
    } else {
        Write-Host "[FCC] Warning: FCC server did not respond in time, attempting launch..." -ForegroundColor Yellow
    }
} else {
    Write-Host "[FCC] Local FCC proxy is active (127.0.0.1:8082)" -ForegroundColor Green
}

# 7. Set session environment variables
$env:ANTHROPIC_BASE_URL = $FccServerUrl
$env:ANTHROPIC_AUTH_TOKEN = "freecc"
$env:CLAUDE_CODE_AUTO_COMPACT_WINDOW = "190000"
$env:DISABLE_AUTOUPDATER = "1"
$env:DISABLE_FEEDBACK_COMMAND = "1"
$env:DISABLE_ERROR_REPORTING = "1"

# 8. Launch fcc-claude
Write-Host "[FCC] Launching fcc-claude in $ProjectRoot..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor DarkGray

if ($FccArgs -and $FccArgs.Count -gt 0) {
    & fcc-claude @FccArgs
} else {
    & fcc-claude
}
