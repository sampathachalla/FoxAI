# Agent Reach integration

This directory contains all FoxAI-specific code and installation logic for Agent Reach.

## Responsibility

- Install the pinned upstream Agent Reach release.
- Configure the Exa MCP search backend through `mcporter`.
- Install the Agent Reach Hermes skill under `~/.hermes/skills/research/agent-reach`.
- Provide the Hermes routing policy for quick vs deep research.
- Detect Agent Reach tool activity from generic Hermes callbacks so the UI can show `searching` without coupling LiveKit to Agent Reach command details.

The LiveKit worker and Hermes adapter do not contain Agent Reach implementation details. The Hermes adapter consumes only generic helpers exported by this package.

## Low-latency routing

Normal conversation does not invoke Agent Reach. Current-information requests use a focused quick path (one search and a small result set). Multi-source/platform research is reserved for explicit deep-research requests.

Environment controls:

```env
AGENT_REACH_ENABLED=true
AGENT_REACH_QUICK_RESULTS=5
AGENT_REACH_DEEP_RESULTS=10
```

These values shape the Hermes research policy while Agent Reach remains responsible for backend/platform routing.

## Cancellation

Agent Reach commands execute inside Hermes' normal tool runtime. FoxAI does not spawn a second research agent. When LiveKit interrupts the active turn, the Hermes adapter calls upstream Hermes hard interruption, which propagates to active tool/child work.

## UI state

Hermes tool callbacks are inspected through `runtime.py`. When Agent Reach activity is detected, the worker sends a best-effort LiveKit data-channel state packet on topic `fox.agent.state`. Failure to publish that supplemental packet never interrupts reasoning, search, or audio.

## Version

`Dockerfile.voice` supplies `AGENT_REACH_REF` to `install.sh`. Keep the ref pinned and test upgrades before changing it.

## Runtime flag

Set `AGENT_REACH_ENABLED=false` to prevent Hermes from being instructed to use Agent Reach. The installed skill can remain present in the image, which keeps rollback safe.
