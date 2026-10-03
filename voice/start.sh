#!/bin/sh
# The voice container runs two processes:
#   local_tts/     HTTP Edge/Piper speech for the API (non-LiveKit voice path)
#   worker.py      LiveKit realtime voice worker
# Both are auto-instrumented with OpenTelemetry (configured by the OTEL_*
# variables Compose sets) and report as separate services.
set -eu

OTEL_SERVICE_NAME=fox-voice-tts opentelemetry-instrument python -m local_tts.server &
OTEL_SERVICE_NAME=fox-voice exec opentelemetry-instrument python worker.py dev
