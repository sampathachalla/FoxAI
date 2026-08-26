#!/bin/sh
echo "[Startup] Starting Python FastAPI Hermes Agent Microservice on port 8000..."
python3 agent/main.py &
PY_PID=$!

echo "[Startup] Starting Node.js Express Server on port 3001..."
npm run dev &
NODE_PID=$!

trap "kill -TERM $PY_PID $NODE_PID" INT TERM EXIT
wait
