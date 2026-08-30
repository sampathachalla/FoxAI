#!/bin/sh
set -eu

AGENT_REACH_REF="${AGENT_REACH_REF:-v1.5.0}"
AGENT_REACH_REPO="${AGENT_REACH_REPO:-https://github.com/Panniantong/Agent-Reach.git}"
AGENT_REACH_PATH="${AGENT_REACH_PATH:-/opt/agent-reach}"
HERMES_SKILL_DIR="${HERMES_SKILL_DIR:-/root/.hermes/skills/research/agent-reach}"

rm -rf "${AGENT_REACH_PATH}"
git clone --depth 1 --branch "${AGENT_REACH_REF}" "${AGENT_REACH_REPO}" "${AGENT_REACH_PATH}"
uv pip install --system -e "${AGENT_REACH_PATH}"

# Agent Reach's Exa search backend uses mcporter. Keep this setup inside the
# integration installer so Dockerfile.voice does not know backend details.
npm install -g mcporter
mcporter config add exa https://mcp.exa.ai/mcp

# Hermes scans ~/.hermes/skills as its primary skill source. Copy the pinned
# Agent Reach skill and referenced docs into a dedicated skill directory.
mkdir -p "${HERMES_SKILL_DIR}/references"
cp "${AGENT_REACH_PATH}/agent_reach/skill/SKILL_en.md" "${HERMES_SKILL_DIR}/SKILL.md"
cp -r "${AGENT_REACH_PATH}/agent_reach/skill/references/." "${HERMES_SKILL_DIR}/references/"

mkdir -p "${AGENT_REACH_HOME:-/root/.agent-reach}"
