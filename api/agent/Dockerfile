FROM python:3.11-slim

WORKDIR /app

# Official Hermes is consumed from its supported source checkout rather than an
# unofficial PyPI wheel. Pin the release for reproducible builds; bump this ARG
# deliberately when upgrading Hermes.
ARG HERMES_UPSTREAM_REF=v2026.8.27
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv \
    && git clone --depth 1 --branch "${HERMES_UPSTREAM_REF}" https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent \
    && uv pip install --system -e "/opt/hermes-agent[edge-tts]"

ENV HERMES_UPSTREAM_PATH=/opt/hermes-agent \
    HERMES_RUNTIME=auto

# Install FoxAI dependencies after Hermes. The Fox ranges are intentionally
# compatible with Hermes' stricter pins, so this keeps the upstream runtime's
# tested dependency versions while adding LiveKit/Groq/Piper.
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

# Copy agent source
COPY . .

# Ensure Piper voice model directory exists even if empty in the build context
RUN mkdir -p Tts/piper_models

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
