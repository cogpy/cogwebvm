#!/bin/bash
# ============================================================================
# DEPLOY COWORK CLOUD VM — Azure CLI wrapper
# ============================================================================
# Prerequisites: Azure CLI installed and logged in (az login)
# Usage: ./deploy.sh [resource-group-name] [vm-password]
# ============================================================================

set -euo pipefail

# --- Configuration ---
RG_NAME="${1:-cowork-rg}"
VM_PASSWORD="${2:-}"
LOCATION="southafricanorth"
VM_SIZE="Standard_D4s_v5"   # Change to Standard_D8s_v5 for heavier workloads
DISK_SIZE=256

echo "========================================"
echo "  COWORK CLOUD VM DEPLOYMENT"
echo "========================================"
echo "Resource Group: $RG_NAME"
echo "Location:       $LOCATION (Johannesburg)"
echo "VM Size:        $VM_SIZE"
echo "Disk:           ${DISK_SIZE}GB Premium SSD"
echo "========================================"

# --- Password handling ---
if [ -z "$VM_PASSWORD" ]; then
    echo ""
    echo "Enter VM admin password (min 12 chars, upper+lower+number+special):"
    read -s VM_PASSWORD
    echo ""
fi

# Validate password length
if [ ${#VM_PASSWORD} -lt 12 ]; then
    echo "ERROR: Password must be at least 12 characters"
    exit 1
fi

# --- Create resource group ---
echo "[1/4] Creating resource group..."
az group create \
    --name "$RG_NAME" \
    --location "$LOCATION" \
    --output table

# --- Deploy ARM template ---
echo "[2/4] Deploying VM (this takes 3-5 minutes)..."
DEPLOY_OUTPUT=$(az deployment group create \
    --resource-group "$RG_NAME" \
    --template-file azuredeploy.json \
    --parameters \
        adminPassword="$VM_PASSWORD" \
        vmSize="$VM_SIZE" \
        osDiskSizeGB=$DISK_SIZE \
    --output json)

# --- Extract outputs ---
echo "[3/4] Extracting connection details..."
PUBLIC_IP=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.vmPublicIP.value')
FQDN=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.vmFQDN.value')
RDP_CMD=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.rdpCommand.value')

# --- Lock down RDP to caller's IP ---
echo "[4/4] Restricting RDP access to your current IP..."
MY_IP=$(curl -s ifconfig.me)
az network nsg rule update \
    --resource-group "$RG_NAME" \
    --nsg-name "cowork-vm-nsg" \
    --name "Allow-RDP" \
    --source-address-prefixes "$MY_IP/32" \
    --output table 2>/dev/null || echo "  (Update NSG manually if this fails)"

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
echo ""
echo "COST CONTROL:"
echo "  Stop VM:    az vm deallocate -g $RG_NAME -n cowork-vm"
echo "  Start VM:   az vm start -g $RG_NAME -n cowork-vm"
echo "  Delete all: az group delete -g $RG_NAME --yes"
echo ""
echo "RDP locked to: $MY_IP (update NSG if your IP changes)"
echo "========================================"
