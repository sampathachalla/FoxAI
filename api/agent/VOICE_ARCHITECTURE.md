# FoxAI Realtime Voice Architecture

The realtime voice path is isolated from the existing browser/REST voice path. `VITE_LIVEKIT_VOICE_ENABLED=false` keeps the previous behavior, while the optional LiveKit worker enables the new low-latency pipeline.

## Runtime flow

```text
React / LiveKit WebRTC client
          |
          v
     LiveKit room
          |
          v
Fox realtime voice worker
          |
     Silero VAD
          |
Groq Whisper Large v3 Turbo
          |
          v
 LiveKit custom llm_node
          |
          v
 HermesVoiceAdapter
    |             |
    | preferred   | compatibility fallback
    v             v
Official Nous   FoxAI existing
Hermes AIAgent  VoiceWorkflow
    |
Groq GPT-OSS 20B (default)
    |
stream_delta_callback
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
```

## Latency strategy

- **Silero VAD** detects speech boundaries locally with short endpointing delays.
- **Groq Whisper Large v3 Turbo** performs fast turn-based transcription.
- **Official Hermes streaming** exposes response deltas through `stream_delta_callback`; FoxAI bridges those deltas back to the asyncio/LiveKit event loop instead of waiting for the complete answer.
- **Phrase buffering** waits only for a short natural boundary (sentence/clause or configured character limit), avoiding choppy word-by-word speech while reducing time-to-first-audio.
- **Edge TTS** streams encoded MP3 chunks into LiveKit's audio decoder as they arrive.
- **Piper** synthesizes short phrases in a worker thread so its blocking subprocess does not stall VAD, STT, or interruption handling.
- **Deepgram** remains an optional native LiveKit TTS provider.
- **LiveKit** owns realtime transport, turn lifecycle, transcripts, playout, and interruption behavior through custom `llm_node` and `tts_node` hooks.

## Official Hermes integration and upgrades

The realtime worker uses the official `NousResearch/hermes-agent` source checkout because upstream documents source-checkout embedding as its supported Python-library workflow. The voice image is currently pinned to the official `v2026.8.27` release for reproducibility.

FoxAI intentionally wraps upstream Hermes in `HermesVoiceAdapter` rather than importing Hermes internals throughout the voice code. If upstream Hermes cannot initialize, the adapter falls back to FoxAI's previous `VoiceWorkflow`, preserving the existing path while the new runtime is rolled out.

To evaluate a future upstream Hermes release, change:

```env
HERMES_UPSTREAM_REF=vYYYY.M.DD
```

and rebuild only the voice worker image. The existing FastAPI Python agent uses its original Dockerfile and is not forced onto the upstream runtime.

## Thinking model

The default realtime Hermes provider is the Groq OpenAI-compatible endpoint with:

```env
HERMES_MODEL=openai/gpt-oss-20b
HERMES_BASE_URL=https://api.groq.com/openai/v1
```

`HERMES_API_KEY` can be supplied separately; otherwise FoxAI reuses `GROQ_API_KEY`.

For voice latency, context-file loading is disabled by default (`HERMES_SKIP_CONTEXT_FILES=true`) while Hermes memory remains enabled. `HERMES_MAX_ITERATIONS=8` bounds runaway tool loops for spoken interactions.

## Frontend TTS provider switching

The existing frontend voice preference is mapped to LiveKit participant attributes:

```text
fox.tts.provider = edge | piper | deepgram
fox.tts.voice    = selected provider voice id
```

Changing the setting while a room is active updates participant attributes, so the worker can switch providers without reconnecting. Edge is the default realtime provider. Unsupported browser-only Web Speech choices map safely to Edge in the LiveKit path.

## Environment

Required for the realtime voice path:

```env
LIVEKIT_URL=wss://YOUR_PROJECT.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
GROQ_API_KEY=...
GROQ_STT_MODEL=whisper-large-v3-turbo
HERMES_UPSTREAM_REF=v2026.8.27
HERMES_RUNTIME=auto
HERMES_MODEL=openai/gpt-oss-20b
HERMES_BASE_URL=https://api.groq.com/openai/v1
VOICE_TTS_PROVIDER=edge
```

Optional latency tuning:

```env
VOICE_MIN_ENDPOINT_MS=450
VOICE_MAX_ENDPOINT_MS=1200
VOICE_TTS_PHRASE_MIN_CHARS=48
VOICE_TTS_PHRASE_MAX_CHARS=180
```

## Run the realtime worker

The worker is behind a Docker Compose profile so existing startup is unchanged:

```bash
docker compose --profile voice up --build
```

For direct development from an environment where upstream Hermes and the voice dependencies are installed:

```bash
cd api/agent
python -m voice.worker dev
```

## Rollback

The compatibility switches are intentional:

- Set `VITE_LIVEKIT_VOICE_ENABLED=false` to use the existing frontend voice path.
- Set `HERMES_RUNTIME=local` to use FoxAI's existing `VoiceWorkflow` inside the realtime worker.
- The `pre-upstream-hermes-backup` branch preserves the branch state from before the upstream-Hermes/streaming-TTS work.
