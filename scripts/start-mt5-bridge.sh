#!/bin/bash
# Start MT5 Bridge service (detached, persistent)
cd /home/z/my-project/mini-services/mt5-bridge

# Kill any existing instance
pkill -f "bun index.ts" 2>/dev/null
sleep 1

# Start with setsid for full detachment (immune to SIGHUP)
setsid nohup bun index.ts > /tmp/mt5-bridge.log 2>&1 < /dev/null &
BRIDGE_PID=$!
disown $BRIDGE_PID 2>/dev/null

sleep 4
if kill -0 $BRIDGE_PID 2>/dev/null; then
  echo "MT5 Bridge started. PID: $BRIDGE_PID"
  echo "Log: /tmp/mt5-bridge.log"
else
  echo "Bridge may have moved. Checking process:"
  pgrep -af "bun index" || echo "Not found via pgrep"
fi
curl -s -o /dev/null -w "Direct connect: %{http_code}\n" "http://127.0.0.1:3004/socket.io/?EIO=4&transport=polling" || echo "Failed to connect"
