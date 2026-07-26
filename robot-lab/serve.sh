#!/usr/bin/env bash
#
# serve.sh — put Robot Lab on the local network.
#
# Plain HTTP on purpose. The robot's API is HTTP-only, and a page served over
# HTTPS is forbidden by the browser from talking to it (mixed content). So this
# stays http:// and the iPad opens it by LAN IP.
#
#   ./serve.sh          serve on port 4200
#   ./serve.sh 4300     serve on another port
#
set -euo pipefail

PORT="${1:-4200}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROBOT_HOST="reachy-mini.local"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Try: ./serve.sh 4300"
  exit 1
fi

# Best-effort LAN address, so the iPad URL can be printed rather than guessed.
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo '')"

echo ""
echo "  🤖  Robot Lab"
echo "  ───────────────────────────────────────────────"
echo "  On this Mac:   http://localhost:$PORT"
if [ -n "$LAN_IP" ]; then
  echo "  On the iPad:   http://$LAN_IP:$PORT"
else
  echo "  On the iPad:   (could not detect this Mac's IP — check System Settings › Network)"
fi
echo ""

# Report the robot's state up front. Knowing before you hand over the tablet
# whether he is reachable saves a confusing minute with a child watching.
if ROBOT_JSON="$(curl -s -m 3 "http://$ROBOT_HOST:8000/api/daemon/status" 2>/dev/null)" \
   && [ -n "$ROBOT_JSON" ]; then
  STATE="$(printf '%s' "$ROBOT_JSON" | sed -n 's/.*"state":"\([a-z_]*\)".*/\1/p')"
  IP="$(printf '%s' "$ROBOT_JSON" | sed -n 's/.*"wlan_ip":"\([0-9.]*\)".*/\1/p')"
  VER="$(printf '%s' "$ROBOT_JSON" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
  echo "  Robot:         found at $IP (daemon $VER, backend: $STATE)"
  if [ "$STATE" != "running" ]; then
    echo "                 backend not running — the app will start it on load"
  fi
  echo "  His dashboard: http://$ROBOT_HOST:8000"
else
  echo "  Robot:         not answering. Everything still works on screen."
  echo "                 Power him on, wait a minute, then tap the chip in the app."
fi

echo ""
echo "  Ctrl-C to stop."
echo ""

cd "$HERE"

# Serve with caching OFF.
#
# `python3 -m http.server` sends no cache-control headers, so Safari happily
# reuses a stale assets/js/*.js after you have edited it — you change a quest,
# reload on the iPad, and see the old behaviour with no indication why. That is
# a miserable thing to debug on a Sunday morning with a child waiting.
#
# This is a LAN development server for a project you edit constantly; there is
# no reason to cache anything.
exec python3 - "$PORT" <<'PYEOF'
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # 404s and errors are worth seeing; a wall of 200s is not.
        status = args[1] if len(args) > 1 else ''
        if not str(status).startswith('2'):
            super().log_message(fmt, *args)


port = int(sys.argv[1])
ThreadingHTTPServer(('0.0.0.0', port), NoCacheHandler).serve_forever()
PYEOF
