#!/usr/bin/env bash
set -u

agent_pid=""
voice_pid=""

shutdown() {
  trap - INT TERM EXIT
  [ -z "$agent_pid" ] || kill -TERM "$agent_pid" 2>/dev/null || true
  [ -z "$voice_pid" ] || kill -TERM "$voice_pid" 2>/dev/null || true
  [ -z "$agent_pid" ] || wait "$agent_pid" 2>/dev/null || true
  [ -z "$voice_pid" ] || wait "$voice_pid" 2>/dev/null || true
}

trap shutdown INT TERM EXIT

echo "[Startup] Starting FastAPI agent on port ${FASTAPI_PORT:-8000}..."
python -m uvicorn main:app --host 0.0.0.0 --port "${FASTAPI_PORT:-8000}" &
agent_pid=$!

echo "[Startup] Starting LiveKit voice worker..."
python -m agents.voice_agent.worker dev &
voice_pid=$!

# End the container if either service exits; the EXIT trap stops the survivor.
wait -n "$agent_pid" "$voice_pid"
status=$?
exit "$status"
