#!/bin/bash

# OpenCog WebVM Unified Startup Script
# Starts CogServer and the Dashboard

set -e

echo "=================================================="
echo "   OPENCOG WEBVM STARTUP"
echo "=================================================="

# 1. Start CogServer
echo "[1/2] Starting CogServer..."
COGSERVER_BIN="/home/ubuntu/occ/cogserver/build/opencog/cogserver/server/cogserver"
COGSERVER_CONF="/home/ubuntu/occ/cogserver/server/cogserver.conf"

if [ ! -f "$COGSERVER_BIN" ]; then
    echo "❌ CogServer binary not found at $COGSERVER_BIN"
    echo "   Please run occ-build-webvm.sh first."
    exit 1
fi

# Check if already running
if pgrep -x "cogserver" > /dev/null; then
    echo "   CogServer is already running."
else
    # Start in background
    cd $(dirname "$COGSERVER_BIN")
    ./cogserver > /tmp/cogserver.log 2>&1 &
    COG_PID=$!
    echo "   CogServer started with PID $COG_PID"
    echo "   Logs: /tmp/cogserver.log"
    
    # Wait for startup
    echo "   Waiting for CogServer to initialize..."
    sleep 5
    if pgrep -x "cogserver" > /dev/null; then
        echo "   ✅ CogServer is running."
    else
        echo "   ❌ CogServer failed to start. Check logs."
        cat /tmp/cogserver.log
        exit 1
    fi
fi

# 2. Start Dashboard
echo "[2/2] Starting OpenCog Dashboard..."
cd /home/ubuntu/opencog-dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing Node.js dependencies..."
    pnpm install
fi

echo "   Starting Dashboard dev server..."
echo "   Access the dashboard at: http://localhost:3000"
echo "=================================================="

# Run dev server
pnpm dev --host
