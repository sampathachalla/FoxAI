# Builds the hermes container. Build context: agents/ (see docker-compose.yml),
# so COPY paths below are relative to agents/.
FROM python:3.11-slim

ARG HERMES_UPSTREAM_REF=v2026.8.27
ARG AGENT_REACH_REF=v1.5.0

# Install upstream Nous Research Hermes (with MCP client support).
RUN apt-get update \
    && apt-get install -y --no-install-recommends git curl nodejs npm gettext-base \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv \
    && git clone --depth 1 --branch "${HERMES_UPSTREAM_REF}" https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent \
    && uv pip install --system -e "/opt/hermes-agent[edge-tts,mcp,otlp]" \
        opentelemetry-distro opentelemetry-exporter-otlp-proto-http \
    && opentelemetry-bootstrap -a requirements | uv pip install --system -r -

ENV AGENT_REACH_HOME=/root/.agent-reach

# Install Agent Reach as a Hermes skill.
COPY agent-reach/install.sh /tmp/install-agent-reach.sh
RUN chmod +x /tmp/install-agent-reach.sh \
    && AGENT_REACH_REF="${AGENT_REACH_REF}" /tmp/install-agent-reach.sh \
    && rm /tmp/install-agent-reach.sh

# Fox's Hermes persona, and its config as a template: some Hermes code paths
# read config.yaml without expanding ${VAR}, so the values are filled in once
# at container start (see CMD) instead.
COPY hermes/SOUL.md /root/.hermes/SOUL.md
COPY hermes/config.yaml /etc/fox/hermes-config.yaml.tmpl

# Hermes' built-in OpenAI-compatible API server. It only starts when
# API_SERVER_KEY (16+ characters) is set; Compose passes it in.
ENV API_SERVER_HOST=0.0.0.0 \
    API_SERVER_PORT=8000 \
    HERMES_MODEL=openai/gpt-oss-20b \
    HERMES_BASE_URL=https://api.groq.com/openai/v1

EXPOSE 8000

# 1. Render config.yaml from the template (only these variables are replaced).
# 2. Start Hermes under opentelemetry-instrument, which traces incoming API
#    requests and outgoing model/MCP calls (configured by Compose's OTEL_* vars).
CMD ["sh", "-c", "envsubst '${HERMES_MODEL} ${HERMES_BASE_URL} ${HERMES_API_KEY} ${FOX_MCP_URL} ${OTEL_EXPORTER_OTLP_ENDPOINT}' < /etc/fox/hermes-config.yaml.tmpl > /root/.hermes/config.yaml && exec opentelemetry-instrument hermes gateway run"]
