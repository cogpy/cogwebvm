#!/bin/bash
# ============================================================================
# RZOAI CLOUDFLARE DNS — Register VM hostname in rzo.ai zone
# ============================================================================
# Run this after the VM is deployed and has a public IP.
# Requires: curl, jq
#
# This script:
#   1. Detects the VM's public IP
#   2. Creates/updates an A record: vm.rzo.ai → public IP
#   3. Optionally enables Cloudflare proxy for DDoS protection
#   4. Reports DNS status
# ============================================================================

set -euo pipefail

# --- Configuration ---
ZONE_ID="f7ac365d28fa7dd2ca2f607fb151ae33"
RECORD_NAME="${1:-vm}"                    # Default: vm.rzo.ai
PROXIED="${2:-false}"                     # Default: DNS only (no proxy for RDP)
CF_API="https://api.cloudflare.com/client/v4"

# --- API Token ---
# The beastflare token is stored as an environment variable
CF_TOKEN="${beastflare:-}"
if [ -z "$CF_TOKEN" ]; then
    echo "ERROR: beastflare environment variable not set"
    echo "Set it with: export beastflare='your-cloudflare-api-token'"
    exit 1
fi

FULL_NAME="${RECORD_NAME}.rzo.ai"

echo "========================================"
echo "  RZOAI CLOUDFLARE DNS REGISTRATION"
echo "========================================"
echo "Zone:    rzo.ai ($ZONE_ID)"
echo "Record:  $FULL_NAME"
echo "Proxied: $PROXIED"
echo "========================================"

# --- Detect public IP ---
echo ""
echo "[1/4] Detecting public IP..."
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "")
if [ -z "$PUBLIC_IP" ]; then
    echo "ERROR: Could not detect public IP"
    exit 1
fi
echo "  Public IP: $PUBLIC_IP"

# --- Check if record already exists ---
echo "[2/4] Checking existing DNS records..."
EXISTING=$(curl -s -X GET \
    "$CF_API/zones/$ZONE_ID/dns_records?type=A&name=$FULL_NAME" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json")

RECORD_COUNT=$(echo "$EXISTING" | jq -r '.result | length')
echo "  Found $RECORD_COUNT existing A record(s) for $FULL_NAME"

if [ "$RECORD_COUNT" -gt "0" ]; then
    # Update existing record
    RECORD_ID=$(echo "$EXISTING" | jq -r '.result[0].id')
    CURRENT_IP=$(echo "$EXISTING" | jq -r '.result[0].content')
    echo "  Existing record: $FULL_NAME → $CURRENT_IP (id: $RECORD_ID)"

    if [ "$CURRENT_IP" = "$PUBLIC_IP" ]; then
        echo "  [OK] IP already matches, no update needed"
    else
        echo "[3/4] Updating DNS record..."
        UPDATE_RESULT=$(curl -s -X PUT \
            "$CF_API/zones/$ZONE_ID/dns_records/$RECORD_ID" \
            -H "Authorization: Bearer $CF_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"A\",
                \"name\": \"$RECORD_NAME\",
                \"content\": \"$PUBLIC_IP\",
                \"ttl\": 300,
                \"proxied\": $PROXIED
            }")

        SUCCESS=$(echo "$UPDATE_RESULT" | jq -r '.success')
        if [ "$SUCCESS" = "true" ]; then
            echo "  [OK] Updated: $FULL_NAME → $PUBLIC_IP"
        else
            ERRORS=$(echo "$UPDATE_RESULT" | jq -r '.errors[]?.message // "unknown error"')
            echo "  [FAIL] Update failed: $ERRORS"
            exit 1
        fi
    fi
else
    # Create new record
    echo "[3/4] Creating DNS record..."
    CREATE_RESULT=$(curl -s -X POST \
        "$CF_API/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $CF_TOKEN" \
        -H "Content-Type: application/json" \
        --data "{
            \"type\": \"A\",
            \"name\": \"$RECORD_NAME\",
            \"content\": \"$PUBLIC_IP\",
            \"ttl\": 300,
            \"proxied\": $PROXIED,
            \"comment\": \"Azure Cowork VM — auto-registered by rzoai-cloudflare-dns.sh\"
        }")

    SUCCESS=$(echo "$CREATE_RESULT" | jq -r '.success')
    if [ "$SUCCESS" = "true" ]; then
        NEW_ID=$(echo "$CREATE_RESULT" | jq -r '.result.id')
        echo "  [OK] Created: $FULL_NAME → $PUBLIC_IP (id: $NEW_ID)"
    else
        ERRORS=$(echo "$CREATE_RESULT" | jq -r '.errors[]?.message // "unknown error"')
        echo "  [FAIL] Creation failed: $ERRORS"
        exit 1
    fi
fi

# --- Verify ---
echo "[4/4] Verifying DNS resolution..."
sleep 2
RESOLVED=$(dig +short "$FULL_NAME" @1.1.1.1 2>/dev/null || nslookup "$FULL_NAME" 1.1.1.1 2>/dev/null | grep -oP '\d+\.\d+\.\d+\.\d+' | tail -1 || echo "")

if [ "$RESOLVED" = "$PUBLIC_IP" ]; then
    echo "  [OK] DNS resolves correctly: $FULL_NAME → $RESOLVED"
elif [ -n "$RESOLVED" ]; then
    echo "  [WARN] DNS resolves to $RESOLVED (expected $PUBLIC_IP) — may need propagation time"
else
    echo "  [WARN] DNS not yet resolving — allow 1-5 minutes for propagation"
fi

echo ""
echo "========================================"
echo "  DNS REGISTRATION COMPLETE"
echo "========================================"
echo ""
echo "Record:   $FULL_NAME → $PUBLIC_IP"
echo "TTL:      300 seconds"
echo "Proxied:  $PROXIED"
echo ""
echo "RDP access: mstsc /v:$FULL_NAME"
echo "========================================"
