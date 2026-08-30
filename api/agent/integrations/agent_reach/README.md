# Agent Reach integration

This directory contains all FoxAI-specific code and installation logic for Agent Reach.

## Responsibility

- Install the pinned upstream Agent Reach release.
- Configure the Exa MCP search backend through `mcporter`.
- Install the Agent Reach Hermes skill under `~/.hermes/skills/research/agent-reach`.
- Provide the small Hermes system-prompt routing hint.

The LiveKit worker and Hermes adapter do not contain Agent Reach implementation details. Removing this directory plus its two generic integration hooks disables the feature without changing the realtime voice architecture.

## Version

`Dockerfile.voice` supplies `AGENT_REACH_REF` to `install.sh`. Keep the ref pinned and test upgrades before changing it.

## Runtime flag

Set `AGENT_REACH_ENABLED=false` to prevent Hermes from being instructed to use Agent Reach. The installed skill can remain present in the image, which keeps rollback safe.
