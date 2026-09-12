# FoxAI Realtime Voice Architecture

The realtime voice path is isolated from the existing browser/REST voice path. `VITE_LIVEKIT_VOICE_ENABLED=false` keeps the previous behavior, while the optional LiveKit worker enables the new low-latency pipeline.

The voice worker is a **LiveKit Agent** — pure realtime transport (VAD, STT, turn detection, TTS). It carries no Hermes dependency and answers conversational turns directly with its own Groq LLM. FoxAI's real orchestrator, upstream **Nous Research Hermes**, lives in the separate FastAPI agent process (`server/routes/agent.py`) that runs alongside the voice worker in the same container. The voice agent reaches Hermes only indirectly, by handing heavier tasks to that FastAPI agent through the `delegate_to_worker_agent` tool.

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
  voice worker --delegate_to_worker_agent--> FastAPI agent (/agent/run)
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

For anything heavier than a quick spoken reply — drafting, research with sources, code, multi-step tasks — the voice agent calls the `delegate_to_worker_agent` tool, which posts the task to the FastAPI agent's `POST /agent/run` over HTTP (`HERMES_FASTAPI_URL`, default `http://127.0.0.1:8000`) and speaks the result back once it's ready. That FastAPI agent is FoxAI's one real orchestrator boundary: it prefers the official `NousResearch/hermes-agent` `AIAgent` (see `agents/hermes_orchestrator.py`), falling back to FoxAI's own unbranded `FoxLocalAgent` only if upstream Hermes can't load.

The container clones the official Hermes checkout at build time (`Dockerfile.voice`, pinned via `HERMES_UPSTREAM_REF`) so it's available to the FastAPI process. See `agents/hermes_bootstrap.py` for how that checkout is given priority over FoxAI's own same-named `tools`/`toolsets` packages, and `agents/hermes_orchestrator.py` for the shared configuration (`HERMES_MODEL`, `HERMES_BASE_URL`, `HERMES_API_KEY`/`GROQ_API_KEY`, toolset allow/deny lists). Upstream Hermes only loads in-process when `VOICE_USE_INPROCESS_HERMES=true` — otherwise the FastAPI agent falls back to `FoxLocalAgent`.

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

Required for the FastAPI agent's Hermes delegation path (same container):

```env
HERMES_UPSTREAM_REF=v2026.8.27
HERMES_RUNTIME=auto
HERMES_MODEL=openai/gpt-oss-20b
HERMES_BASE_URL=https://api.groq.com/openai/v1
```

Optional latency tuning:

```env
VOICE_MIN_ENDPOINT_MS=450
VOICE_MAX_ENDPOINT_MS=1200
VOICE_TTS_PHRASE_MIN_CHARS=48
VOICE_TTS_PHRASE_MAX_CHARS=180
```

## Run the combined agent and realtime worker

Docker Compose starts the FastAPI agent and LiveKit worker together in one container:

```bash
docker compose up --build
```

For direct development from an environment where upstream Hermes and the voice dependencies are installed:

```bash
cd api/agent
python -m agents.voice_agent.worker dev
```

## Rollback

The compatibility switches are intentional:

- Set `VITE_LIVEKIT_VOICE_ENABLED=false` to use the existing frontend voice path.
- Set `HERMES_RUNTIME=local` to force the FastAPI agent's delegation path onto FoxAI's own `FoxLocalAgent` instead of upstream Hermes.
- The `pre-upstream-hermes-backup` branch preserves the branch state from before the upstream-Hermes/streaming-TTS work.
