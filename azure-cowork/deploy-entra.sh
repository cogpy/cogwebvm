#!/bin/bash
# ============================================================================
# DEPLOY COWORK CLOUD VM — With ReZonAi Entra ID Join
# ============================================================================
# Extended deployment script that optionally joins the VM to the ReZonAi
# Entra ID tenant and registers its hostname in the rzo.ai Cloudflare zone.
#
# Usage:
#   ./deploy-entra.sh [resource-group] [password] [--entra] [--dns]
#
# Examples:
#   ./deploy-entra.sh cowork-rg "MyP@ss123!"              # Basic deploy
#   ./deploy-entra.sh cowork-rg "MyP@ss123!" --entra      # + Entra join
#   ./deploy-entra.sh cowork-rg "MyP@ss123!" --entra --dns # + DNS registration
# ============================================================================

set -euo pipefail

# --- Parse arguments ---
RG_NAME="${1:-cowork-rg}"
VM_PASSWORD="${2:-}"
ENTRA_JOIN=false
DNS_REGISTER=false

for arg in "${@:3}"; do
    case "$arg" in
        --entra) ENTRA_JOIN=true ;;
        --dns)   DNS_REGISTER=true ;;
        *)       echo "Unknown argument: $arg"; exit 1 ;;
    esac
done

LOCATION="southafricanorth"
VM_SIZE="Standard_D4s_v5"
DISK_SIZE=256
TEMPLATE="azuredeploy.json"

# Use Entra template if join requested
if [ "$ENTRA_JOIN" = true ]; then
    TEMPLATE="azuredeploy-entra.json"
fi

echo "========================================"
echo "  COWORK CLOUD VM DEPLOYMENT"
echo "  ReZonAi Integration Edition"
echo "========================================"
echo "Resource Group: $RG_NAME"
echo "Location:       $LOCATION (Johannesburg)"
echo "VM Size:        $VM_SIZE"
echo "Disk:           ${DISK_SIZE}GB Premium SSD"
echo "Entra Join:     $ENTRA_JOIN"
echo "DNS Register:   $DNS_REGISTER"
echo "Template:       $TEMPLATE"
echo "========================================"

# --- Password handling ---
if [ -z "$VM_PASSWORD" ]; then
    echo ""
    echo "Enter VM admin password (min 12 chars, upper+lower+number+special):"
    read -s VM_PASSWORD
    echo ""
fi

if [ ${#VM_PASSWORD} -lt 12 ]; then
    echo "ERROR: Password must be at least 12 characters"
    exit 1
fi

# --- Create resource group ---
echo "[1/5] Creating resource group..."
az group create \
    --name "$RG_NAME" \
    --location "$LOCATION" \
    --output table

# --- Deploy ARM template ---
echo "[2/5] Deploying VM (3-5 minutes)..."
DEPLOY_PARAMS="adminPassword=$VM_PASSWORD vmSize=$VM_SIZE osDiskSizeGB=$DISK_SIZE"

if [ "$ENTRA_JOIN" = true ]; then
    DEPLOY_PARAMS="$DEPLOY_PARAMS entraJoin=true"
fi

DEPLOY_OUTPUT=$(az deployment group create \
    --resource-group "$RG_NAME" \
    --template-file "$TEMPLATE" \
    --parameters $DEPLOY_PARAMS \
    --output json)

# --- Extract outputs ---
echo "[3/5] Extracting connection details..."
PUBLIC_IP=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.vmPublicIP.value')
FQDN=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.vmFQDN.value')
RDP_CMD=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.rdpCommand.value')

# --- Lock down RDP ---
echo "[4/5] Restricting RDP to your IP..."
MY_IP=$(curl -s ifconfig.me)
az network nsg rule update \
    --resource-group "$RG_NAME" \
    --nsg-name "cowork-vm-nsg" \
    --name "Allow-RDP" \
    --source-address-prefixes "$MY_IP/32" \
    --output table 2>/dev/null || echo "  (Update NSG manually if this fails)"

# --- DNS Registration ---
if [ "$DNS_REGISTER" = true ]; then
    echo "[5/5] Registering DNS: vm.rzo.ai → $PUBLIC_IP..."
    if [ -n "${beastflare:-}" ]; then
        bash scripts/rzoai-cloudflare-dns.sh vm false
    else
        echo "  [SKIP] beastflare env var not set — register DNS manually"
    fi
else
    echo "[5/5] Skipping DNS registration (use --dns to enable)"
fi

echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "Public IP:   $PUBLIC_IP"
echo "FQDN:        $FQDN"
echo "RDP Command: $RDP_CMD"
echo "Username:    coworkadmin"
echo ""
echo "NEXT STEPS:"
echo "  1. RDP into the VM:  $RDP_CMD"
echo "  2. Open PowerShell as Admin"
echo "  3. Run:  .\\Setup-CoworkVM.ps1"
echo "  4. Reboot when prompted"
echo "  5. Install Claude Desktop from claude.com/download"
echo "  6. Sign in, switch to Cowork tab, select C:\\CoworkData"

if [ "$ENTRA_JOIN" = true ]; then
    echo ""
    echo "RZOAI INTEGRATION:"
    echo "  7. Run:  .\\scripts\\rzoai-entra-join.ps1"
    echo "  8. Run:  python scripts\\rzoai-graph-bootstrap.py --full"
fi

echo ""
echo "COST CONTROL:"
echo "  Stop VM:    az vm deallocate -g $RG_NAME -n cowork-vm"
echo "  Start VM:   az vm start -g $RG_NAME -n cowork-vm"
echo "  Delete all: az group delete -g $RG_NAME --yes"
echo ""
echo "RDP locked to: $MY_IP"
echo "========================================"
