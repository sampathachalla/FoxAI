# FoxAI Realtime Voice Architecture

The realtime voice path is isolated from the existing browser/REST voice path. `VITE_LIVEKIT_VOICE_ENABLED=false` keeps the previous behavior, while the optional LiveKit worker enables the new low-latency pipeline.

The voice worker is a **LiveKit Agent** — pure realtime transport (VAD, STT, turn detection, TTS). It carries no Hermes dependency and answers conversational turns directly with its own Groq LLM. FoxAI's real orchestrator, upstream **Nous Research Hermes**, lives in a separate FastAPI agent container (`server/routes/agent.py`). The voice agent reaches Hermes only indirectly, by handing heavier tasks to that FastAPI service through the `delegate_to_worker_agent` tool.

## Runtime flow

```text
React / LiveKit WebRTC client
          |
          v
     LiveKit room
          |
          v
Fox realtime voice worker (LiveKit Agent)
          |
     Silero VAD
          |
Groq Whisper Large v3 Turbo
          |
          v
 LiveKit custom llm_node
          |
          v
Groq GPT-OSS 20B (session LLM, direct)
          |
short phrase buffer
          |
 LiveKit custom tts_node
  /       |        \
Edge    Piper    Deepgram
(default) (local)  (optional)
  \       |        /
      LiveKit audio
          |
          v
       Browser

  Heavier tasks (drafting, research, code, multi-step work):
  voice worker --delegate_to_worker_agent--> Hermes (/v1/chat/completions)
                                                    |
                                          Nous Research Hermes AIAgent
                                          (fallback: FoxAI's FoxLocalAgent)
```

## Latency strategy

- **Silero VAD** detects speech boundaries locally with short endpointing delays.
- **Groq Whisper Large v3 Turbo** performs fast turn-based transcription.
- **Groq LLM** answers each turn directly through LiveKit's own streaming `llm_node` — no extra hop, since the voice agent has no external orchestrator to consult for ordinary conversation.
- **Phrase buffering** waits only for a short natural boundary (sentence/clause or configured character limit), avoiding choppy word-by-word speech while reducing time-to-first-audio.
- **Edge TTS** streams encoded MP3 chunks into LiveKit's audio decoder as they arrive.
- **Piper** synthesizes short phrases in a worker thread so its blocking subprocess does not stall VAD, STT, or interruption handling.
- **Deepgram** remains an optional native LiveKit TTS provider.
- **LiveKit** owns realtime transport, turn lifecycle, transcripts, playout, and interruption behavior through custom `llm_node` and `tts_node` hooks.

## Delegating to Nous Research Hermes

For anything heavier than a quick spoken reply — drafting, research with sources, code, multi-step tasks — the voice agent calls the `delegate_to_worker_agent` tool, which posts the task to the `hermes` container's OpenAI-compatible `POST /v1/chat/completions` (`HERMES_URL`, default `http://127.0.0.1:8000`, authenticated with `HERMES_GATEWAY_KEY`) and speaks the result back once it's ready. That container runs the official `NousResearch/hermes-agent` gateway; there is no fallback agent.

The `hermes` container clones the official Hermes checkout at build time (`deploy/docker/agents.Dockerfile`, pinned via `HERMES_UPSTREAM_REF`). Its configuration is `agents/hermes/config.yaml` (`HERMES_MODEL`, `HERMES_BASE_URL`, `HERMES_API_KEY`) and its persona is `agents/hermes/SOUL.md`. Fox's own tools are served by the `mcp-server` container and registered with Hermes over MCP (`FOX_MCP_URL`).

## Frontend TTS provider switching

The existing frontend voice preference is mapped to LiveKit participant attributes:

```text
fox.tts.provider = edge | piper | deepgram
fox.tts.voice    = selected provider voice id
```

Changing the setting while a room is active updates participant attributes, so the worker can switch providers without reconnecting. Edge is the default realtime provider. Unsupported browser-only Web Speech choices map safely to Edge in the LiveKit path.

## Agent state UI

`listening` / `thinking` / `speaking` / `idle` reach the frontend for free through livekit-agents' own `lk.agent.state` participant attribute — no custom backend plumbing is needed for the voice agent's own state.

## Environment

Required for the realtime voice path:

```env
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GROQ_API_KEY=...
GROQ_STT_MODEL=whisper-large-v3-turbo
VOICE_LLM_MODEL=openai/gpt-oss-20b
VOICE_TTS_PROVIDER=edge
```

Required for the separate `hermes` container's delegation path:

```env
HERMES_UPSTREAM_REF=v2026.8.27
HERMES_MODEL=openai/gpt-oss-20b
HERMES_BASE_URL=https://api.groq.com/openai/v1
HERMES_API_KEY=...
HERMES_GATEWAY_KEY=...   # shared by hermes, api and voice
```

Optional latency tuning:

```env
VOICE_MIN_ENDPOINT_MS=450
VOICE_MAX_ENDPOINT_MS=1200
VOICE_TTS_PHRASE_MIN_CHARS=48
VOICE_TTS_PHRASE_MAX_CHARS=180
```

## Run Hermes, the MCP server and the realtime worker

Docker Compose starts Hermes, the MCP server and the LiveKit worker as separate containers on the shared network:

```bash
docker compose up --build
```

For direct development, run each service from its own folder:

```bash
docker compose up --build hermes  # Hermes on :8000 (configuration only)
cd mcp-server && python main.py  # MCP tools + TTS on :8100
cd voice && python worker.py dev  # LiveKit worker
```

## Rollback

The compatibility switches are intentional:

- Set `VITE_LIVEKIT_VOICE_ENABLED=false` to use the existing frontend voice path.
- The `pre-upstream-hermes-backup` branch preserves the branch state from before the upstream-Hermes/streaming-TTS work.
