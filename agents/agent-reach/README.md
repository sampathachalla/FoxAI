# Agent Reach

`install.sh` runs during the Hermes image build. It:

- Installs the pinned upstream Agent Reach release.
- Configures the Exa MCP search backend through `mcporter`.
- Installs the Agent Reach Hermes skill under `~/.hermes/skills/research/agent-reach`.

Agent Reach commands execute inside Hermes' normal tool runtime; Fox does not
run a second research agent.

## Routing policy

When to search, and the quick (5 results) vs deep (10 results) paths, are
described to the model in `agents/hermes/SOUL.md`. Edit that file to change the
policy.

## Version

`deploy/docker/agents.Dockerfile` supplies `AGENT_REACH_REF` to `install.sh`. Keep the ref
pinned and test upgrades before changing it.
