# ============================================================================
# COWORK CLOUD VM — POST-DEPLOYMENT SETUP
# ============================================================================
# Run this script via RDP after the ARM template deploys the VM.
# Execute as Administrator in PowerShell.
# ============================================================================

param(
    [switch]$SkipReboot,
    [switch]$InstallClaude,
    [string]$WorkFolder = "C:\CoworkData"
)

$ErrorActionPreference = "Stop"
$LogFile = "$env:USERPROFILE\Desktop\cowork-setup.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $entry = "[$timestamp] [$Level] $Message"
    Write-Host $entry -ForegroundColor $(switch($Level) { "ERROR" { "Red" } "WARN" { "Yellow" } "OK" { "Green" } default { "White" } })
    Add-Content -Path $LogFile -Value $entry
}

# ============================================================================
# PHASE 1: VALIDATE ENVIRONMENT
# ============================================================================
Write-Log "=== COWORK CLOUD VM SETUP STARTING ==="
Write-Log "Computer: $env:COMPUTERNAME"
Write-Log "OS: $((Get-CimInstance Win32_OperatingSystem).Caption)"
Write-Log "RAM: $([math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)) GB"
Write-Log "CPU: $((Get-CimInstance Win32_Processor).Name)"

# Check we're running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Log "ERROR: Run this script as Administrator!" "ERROR"
    exit 1
}

# Check VM supports nested virtualisation (Intel VT-x / AMD-V)
$cpu = Get-CimInstance Win32_Processor
$vmFirmware = (Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled
Write-Log "CPU Virtualisation Firmware: $vmFirmware"

# ============================================================================
# PHASE 2: ENABLE NESTED VIRTUALISATION FEATURES
# ============================================================================
Write-Log "=== PHASE 2: Enabling virtualisation features ==="

# Virtual Machine Platform (required for Cowork's internal VM)
$vmp = Get-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform"
if ($vmp.State -ne "Enabled") {
    Write-Log "Enabling Virtual Machine Platform..."
    Enable-WindowsOptionalFeature -Online -FeatureName "VirtualMachinePlatform" -All -NoRestart
    Write-Log "Virtual Machine Platform enabled" "OK"
} else {
    Write-Log "Virtual Machine Platform already enabled" "OK"
}

# Windows Hypervisor Platform
$whp = Get-WindowsOptionalFeature -Online -FeatureName "HypervisorPlatform"
if ($whp.State -ne "Enabled") {
    Write-Log "Enabling Windows Hypervisor Platform..."
    Enable-WindowsOptionalFeature -Online -FeatureName "HypervisorPlatform" -All -NoRestart
    Write-Log "Windows Hypervisor Platform enabled" "OK"
} else {
    Write-Log "Windows Hypervisor Platform already enabled" "OK"
}

# Hyper-V (optional but useful for diagnostics)
$hyperv = Get-WindowsOptionalFeature -Online -FeatureName "Microsoft-Hyper-V-All"
if ($null -ne $hyperv -and $hyperv.State -ne "Enabled") {
    Write-Log "Enabling Hyper-V..."
    try {
        Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Hyper-V-All" -All -NoRestart
        Write-Log "Hyper-V enabled" "OK"
    } catch {
        Write-Log "Hyper-V not available on this SKU (Windows 11 Home?) — Cowork may still work via VMP" "WARN"
    }
} else {
    Write-Log "Hyper-V already enabled or not applicable" "OK"
}

# WSL2 (useful for dev work alongside Cowork)
$wsl = Get-WindowsOptionalFeature -Online -FeatureName "Microsoft-Windows-Subsystem-Linux"
if ($wsl.State -ne "Enabled") {
    Write-Log "Enabling WSL..."
    Enable-WindowsOptionalFeature -Online -FeatureName "Microsoft-Windows-Subsystem-Linux" -All -NoRestart
    Write-Log "WSL enabled" "OK"
} else {
    Write-Log "WSL already enabled" "OK"
}

# ============================================================================
# PHASE 3: CREATE WORKSPACE STRUCTURE
# ============================================================================
Write-Log "=== PHASE 3: Creating workspace ==="

$folders = @(
    $WorkFolder,
    "$WorkFolder\Projects",
    "$WorkFolder\Documents",
    "$WorkFolder\Research",
    "$WorkFolder\Legal",
    "$WorkFolder\Exports"
)

foreach ($folder in $folders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Log "Created: $folder" "OK"
    }
}

# Create a README for the workspace
$readme = @"
# Cowork Cloud Workspace
# ======================
# Location: $WorkFolder
#
# Structure:
#   Projects/   — Active project files
#   Documents/  — Generated documents, reports, memos
#   Research/   — Research outputs, synthesised data
#   Legal/      — Legal documents, affidavits, case files
#   Exports/    — Exported files, spreadsheets, presentations
#
# Point Claude Cowork at this folder or any subfolder.
# Claude has read/write access to whatever folder you select.
#
# Setup date: $(Get-Date -Format 'yyyy-MM-dd')
# VM: $env:COMPUTERNAME
"@
Set-Content -Path "$WorkFolder\README.md" -Value $readme
Write-Log "Workspace readme created" "OK"

# ============================================================================
# PHASE 4: SYSTEM OPTIMISATIONS
# ============================================================================
Write-Log "=== PHASE 4: System optimisations ==="

# Disable Windows Search indexing on workspace (reduces disk I/O)
try {
    $wmiObj = Get-WmiObject -Class Win32_Volume -Filter "DriveLetter='C:'"
    if ($wmiObj) {
        $wmiObj.IndexingEnabled = $false
        $wmiObj.Put() | Out-Null
        Write-Log "Disabled search indexing on C:" "OK"
    }
} catch {
    Write-Log "Could not disable indexing: $($_.Exception.Message)" "WARN"
}

# Set power plan to High Performance (prevents CPU throttling)
try {
    $highPerf = powercfg -list | Select-String "High performance"
    if ($highPerf) {
        $guid = ($highPerf.ToString() -split '\s+')[3]
        powercfg -setactive $guid
        Write-Log "Power plan set to High Performance" "OK"
    }
} catch {
    Write-Log "Could not set power plan: $($_.Exception.Message)" "WARN"
}

# Disable sleep/hibernate (VM must stay awake for scheduled tasks)
powercfg -change -standby-timeout-ac 0
powercfg -change -hibernate-timeout-ac 0
powercfg -change -monitor-timeout-ac 30
Write-Log "Sleep/hibernate disabled, monitor timeout 30min" "OK"

# Enable long paths (useful for deep project structures)
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
Write-Log "Long paths enabled" "OK"

# ============================================================================
# PHASE 5: INSTALL CLAUDE DESKTOP
# ============================================================================
if ($InstallClaude) {
    Write-Log "=== PHASE 5: Installing Claude Desktop ==="

    $installerUrl = "https://storage.googleapis.com/anthropic-desktop/claude-desktop/latest/ClaudeSetup.exe"
    $installerPath = "$env:TEMP\ClaudeSetup.exe"

    try {
        Write-Log "Downloading Claude Desktop installer..."
        Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
        Write-Log "Download complete. Launching installer..." "OK"

        # NOTE: The installer is interactive — it will open a GUI.
        # On enterprise/cloud VMs it may require Developer Mode or MSIX sideloading.
        # If this fails, see PHASE 5b for the MSIX approach.
        Start-Process -FilePath $installerPath -Wait
        Write-Log "Claude Desktop installer launched" "OK"
    } catch {
        Write-Log "Auto-install failed: $($_.Exception.Message)" "WARN"
        Write-Log "Try manual install: download from claude.com/download" "WARN"
    }
} else {
    Write-Log "=== PHASE 5: Skipping Claude install (use -InstallClaude to enable) ==="
    Write-Log "Download manually from: https://claude.com/download"
}

# ============================================================================
# PHASE 5b: MSIX SIDELOAD (if standard installer fails)
# ============================================================================
# If the .exe installer fails due to Developer Mode restrictions, use MSIX:
#
# 1. Download the MSIX from claude.com/download (pick Windows)
# 2. Copy to this VM
# 3. Run:
#    Add-AppxPackage -Path "C:\path\to\Claude.msix"
#
# This bypasses the Developer Mode requirement entirely.
# See: https://amitkoth.com/deploy-claude-desktop-enterprise-windows/

# ============================================================================
# PHASE 6: FIREWALL RULES
# ============================================================================
Write-Log "=== PHASE 6: Firewall configuration ==="

# Allow Claude Desktop outbound (it needs HTTPS to Anthropic's API)
try {
    $existingRule = Get-NetFirewallRule -DisplayName "Claude Desktop Outbound" -ErrorAction SilentlyContinue
    if (-not $existingRule) {
        New-NetFirewallRule -DisplayName "Claude Desktop Outbound" `
            -Direction Outbound `
            -Action Allow `
            -Protocol Tcp `
            -RemotePort 443 `
            -Program "*\Claude\*" `
            -Description "Allow Claude Desktop HTTPS traffic to Anthropic API" | Out-Null
        Write-Log "Firewall rule created for Claude Desktop" "OK"
    } else {
        Write-Log "Firewall rule already exists" "OK"
    }
} catch {
    Write-Log "Firewall rule creation skipped: $($_.Exception.Message)" "WARN"
}

# ============================================================================
# PHASE 7: RDP QUALITY SETTINGS
# ============================================================================
Write-Log "=== PHASE 7: RDP optimisation ==="

# Optimise RDP for responsiveness (important for Cowork UI interaction)
$rdpTcpPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server\WinStations\RDP-Tcp"
try {
    # Enable RemoteFX (GPU acceleration for RDP)
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services" -Name "fEnableRemoteFXAdvancedRemoteApp" -Value 1 -Force -ErrorAction SilentlyContinue

    # Set colour depth to 32-bit
    Set-ItemProperty -Path $rdpTcpPath -Name "ColorDepth" -Value 5 -ErrorAction SilentlyContinue

    Write-Log "RDP quality settings applied" "OK"
} catch {
    Write-Log "RDP settings partially applied: $($_.Exception.Message)" "WARN"
}

# ============================================================================
# PHASE 8: SUMMARY & NEXT STEPS
# ============================================================================
Write-Log "=== SETUP COMPLETE ==="
Write-Log ""
Write-Log "NEXT STEPS:"
Write-Log "1. REBOOT this VM to activate virtualisation features"
Write-Log "2. After reboot, verify: Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform"
Write-Log "3. Install Claude Desktop from https://claude.com/download"
Write-Log "4. Sign in with your Claude Pro/Max/Team/Enterprise account"
Write-Log "5. Switch to Cowork tab"
Write-Log "6. Point Cowork at: $WorkFolder"
Write-Log ""
Write-Log "COST MANAGEMENT:"
Write-Log "- Auto-shutdown is configured for 23:00 SAST"
Write-Log "- To start VM: Azure Portal > VM > Start (or az vm start)"
Write-Log "- To stop and deallocate: az vm deallocate --name $env:COMPUTERNAME --resource-group <rg>"
Write-Log "- You only pay when the VM is running (compute) + always for disk storage"
Write-Log ""
Write-Log "SECURITY:"
Write-Log "- Restrict the NSG RDP rule to your IP address!"
Write-Log "- Consider Azure Bastion for RDP-without-public-IP"
Write-Log ""
Write-Log "Log saved to: $LogFile"

if (-not $SkipReboot) {
    Write-Log "Rebooting in 30 seconds... (use -SkipReboot to prevent)" "WARN"
    Start-Sleep -Seconds 30
    Restart-Computer -Force
}
