#!/bin/sh
WAKEWORD_PYTHON="python3"
if [ -x "./wakeword/.venv/bin/python" ]; then
  WAKEWORD_PYTHON="./wakeword/.venv/bin/python"
fi

echo "[Startup] Starting Python OpenWakeWord service on port 8011..."
$WAKEWORD_PYTHON wakeword/main.py &
WAKEWORD_PID=$!

echo "[Startup] Starting Node.js Express Server on port 3001..."
npm run dev &
NODE_PID=$!

trap "kill -TERM $WAKEWORD_PID $NODE_PID" INT TERM EXIT
wait
