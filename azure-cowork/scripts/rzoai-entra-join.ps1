# ============================================================================
# RZOAI ENTRA ID JOIN — Register VM with ReZonAi Tenant
# ============================================================================
# Run inside the Azure VM after Setup-CoworkVM.ps1 completes.
# Execute as Administrator in PowerShell.
#
# This script:
#   1. Joins the VM to the ReZonAi Entra ID tenant
#   2. Configures the VM as a managed device
#   3. Registers with DevOps-Agents group
#   4. Installs Azure CLI and Graph SDK for automation
# ============================================================================

param(
    [string]$TenantId = "6a5b8c74-51fa-4950-9a13-0fe9cfad1134",
    [string]$DevOpsUserUPN = "d@rzo.ai",
    [switch]$SkipAzureCLI,
    [switch]$SkipGraphSDK
)

$ErrorActionPreference = "Stop"
$LogFile = "$env:USERPROFILE\Desktop\rzoai-entra-join.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] $Message"
    Write-Host $entry -ForegroundColor $(switch($Level) { "ERROR" { "Red" } "WARN" { "Yellow" } "OK" { "Green" } default { "White" } })
    Add-Content -Path $LogFile -Value $entry
}

# ============================================================================
# PHASE 1: PREREQUISITES CHECK
# ============================================================================
Write-Log "=== RZOAI ENTRA ID JOIN STARTING ==="
Write-Log "Target Tenant: ReZonAi ($TenantId)"
Write-Log "DevOps User: $DevOpsUserUPN"

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Log "ERROR: Run this script as Administrator!" "ERROR"
    exit 1
}

# ============================================================================
# PHASE 2: INSTALL AZURE CLI
# ============================================================================
if (-not $SkipAzureCLI) {
    Write-Log "=== PHASE 2: Installing Azure CLI ==="
    $azCmd = Get-Command az -ErrorAction SilentlyContinue
    if (-not $azCmd) {
        Write-Log "Downloading Azure CLI installer..."
        $azInstallerUrl = "https://aka.ms/installazurecliwindowsx64"
        $azInstallerPath = "$env:TEMP\AzureCLI.msi"
        try {
            Invoke-WebRequest -Uri $azInstallerUrl -OutFile $azInstallerPath -UseBasicParsing
            Write-Log "Installing Azure CLI (silent)..."
            Start-Process msiexec.exe -ArgumentList "/i `"$azInstallerPath`" /quiet /norestart" -Wait
            # Refresh PATH
            $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
            Write-Log "Azure CLI installed" "OK"
        } catch {
            Write-Log "Azure CLI install failed: $($_.Exception.Message)" "WARN"
            Write-Log "Install manually: https://aka.ms/installazurecli" "WARN"
        }
    } else {
        Write-Log "Azure CLI already installed: $(az version --query '\"azure-cli\"' -o tsv)" "OK"
    }
}

# ============================================================================
# PHASE 3: INSTALL MICROSOFT GRAPH POWERSHELL SDK
# ============================================================================
if (-not $SkipGraphSDK) {
    Write-Log "=== PHASE 3: Installing Microsoft Graph PowerShell SDK ==="
    $graphModule = Get-Module -ListAvailable -Name Microsoft.Graph.Authentication -ErrorAction SilentlyContinue
    if (-not $graphModule) {
        Write-Log "Installing Microsoft.Graph module (this may take a few minutes)..."
        try {
            Install-Module Microsoft.Graph -Scope AllUsers -Force -AllowClobber -ErrorAction Stop
            Write-Log "Microsoft Graph SDK installed" "OK"
        } catch {
            Write-Log "Graph SDK install failed: $($_.Exception.Message)" "WARN"
        }
    } else {
        Write-Log "Microsoft Graph SDK already installed" "OK"
    }
}

# ============================================================================
# PHASE 4: ENTRA ID DEVICE REGISTRATION
# ============================================================================
Write-Log "=== PHASE 4: Entra ID Device Registration ==="

# Check current join status
$dsregStatus = dsregcmd /status 2>&1
$isAzureAdJoined = ($dsregStatus | Select-String "AzureAdJoined\s*:\s*YES") -ne $null

if ($isAzureAdJoined) {
    $tenantName = ($dsregStatus | Select-String "TenantName\s*:\s*(.+)" | ForEach-Object { $_.Matches[0].Groups[1].Value.Trim() })
    Write-Log "VM already joined to Entra ID tenant: $tenantName" "OK"
} else {
    Write-Log "VM not yet joined to Entra ID. Initiating workplace join..."
    Write-Log "A browser window will open for authentication." "WARN"
    Write-Log "Sign in with: $DevOpsUserUPN" "WARN"

    # Trigger Entra ID workplace join via Settings
    # This opens the Settings > Accounts > Access work or school page
    Start-Process "ms-settings:workplace"

    Write-Log "Please complete the Entra ID join in the Settings window." "WARN"
    Write-Log "After joining, run this script again to verify." "WARN"

    # Wait for user to complete
    Write-Host ""
    Write-Host "Press Enter after completing the Entra ID join in Settings..." -ForegroundColor Cyan
    Read-Host
}

# Re-check after potential join
$dsregStatus = dsregcmd /status 2>&1
$isAzureAdJoined = ($dsregStatus | Select-String "AzureAdJoined\s*:\s*YES") -ne $null
$isWorkplaceJoined = ($dsregStatus | Select-String "WorkplaceJoined\s*:\s*YES") -ne $null

if ($isAzureAdJoined -or $isWorkplaceJoined) {
    Write-Log "Entra ID join status: CONFIRMED" "OK"
} else {
    Write-Log "Entra ID join not detected. You can join later via Settings > Accounts > Access work or school" "WARN"
}

# ============================================================================
# PHASE 5: CONFIGURE ENVIRONMENT VARIABLES
# ============================================================================
Write-Log "=== PHASE 5: Configuring environment ==="

# Set tenant-level environment variables for scripts
$envVars = @{
    "RZOAI_TENANT_ID"    = $TenantId
    "RZOAI_DOMAIN"       = "rzo.ai"
    "RZOAI_DEVOPS_UPN"   = $DevOpsUserUPN
    "RZOAI_DEVOPS_GROUP" = "5e93d67d-23f1-4457-be25-562460dde48f"
}

foreach ($kv in $envVars.GetEnumerator()) {
    [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value, "Machine")
    Write-Log "Set env: $($kv.Key) = $($kv.Value)" "OK"
}

# ============================================================================
# PHASE 6: INSTALL PYTHON + DEPENDENCIES
# ============================================================================
Write-Log "=== PHASE 6: Python environment ==="

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Log "Installing Python via winget..."
    try {
        winget install Python.Python.3.12 --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        Write-Log "Python installed" "OK"
    } catch {
        Write-Log "Python install via winget failed. Install manually from python.org" "WARN"
    }
} else {
    Write-Log "Python already installed: $(python --version)" "OK"
}

# Install required Python packages
try {
    pip install requests msal azure-identity msgraph-sdk 2>&1 | Out-Null
    Write-Log "Python packages installed (requests, msal, azure-identity, msgraph-sdk)" "OK"
} catch {
    Write-Log "pip install failed — install packages manually after Python is available" "WARN"
}

# ============================================================================
# PHASE 7: INSTALL GIT
# ============================================================================
Write-Log "=== PHASE 7: Git configuration ==="

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Log "Installing Git via winget..."
    try {
        winget install Git.Git --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
        Write-Log "Git installed" "OK"
    } catch {
        Write-Log "Git install via winget failed. Install manually from git-scm.com" "WARN"
    }
} else {
    Write-Log "Git already installed: $(git --version)" "OK"
}

# Configure git for the DevOps agent
try {
    git config --global user.name "d@rzo.ai"
    git config --global user.email "d@rzo.ai"
    git config --global init.defaultBranch main
    Write-Log "Git configured for d@rzo.ai" "OK"
} catch {
    Write-Log "Git config failed — configure manually" "WARN"
}

# ============================================================================
# PHASE 8: SUMMARY
# ============================================================================
Write-Log ""
Write-Log "=== RZOAI ENTRA ID JOIN COMPLETE ==="
Write-Log ""
Write-Log "Tenant:       ReZonAi (6a5b8c74-51fa-4950-9a13-0fe9cfad1134)"
Write-Log "Domain:       rzo.ai"
Write-Log "DevOps User:  d@rzo.ai"
Write-Log "DevOps Group: DevOps-Agents (5e93d67d-23f1-4457-be25-562460dde48f)"
Write-Log ""
Write-Log "NEXT STEPS:"
Write-Log "1. Run: python scripts\rzoai-graph-bootstrap.py"
Write-Log "2. Run: bash scripts\rzoai-cloudflare-dns.sh"
Write-Log "3. Verify Graph API: python -c `"import requests; print('OK')`""
Write-Log ""
Write-Log "Log saved to: $LogFile"
