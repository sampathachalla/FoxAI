# FoxAI Realtime Voice Architecture

The `new-architecture` branch separates realtime media from Hermes reasoning so Hermes can evolve independently.

## Runtime flow

```text
React / LiveKit WebRTC client
          |
          v
     LiveKit room
          |
          v
Fox realtime voice worker
  |       |       |
Silero   Groq   Deepgram
 VAD    Whisper    TTS
  |       |       ^
  +--- turn ------+
          |
          v
  HermesVoiceAdapter
          |
          v
 existing VoiceWorkflow
          |
          v
 existing HermesAgent
          |
    tools / memory / LLM
```

## Responsibilities

- **LiveKit**: full-duplex WebRTC transport, room/session lifecycle, audio tracks and interruption lifecycle.
- **Silero VAD**: fast local speech start/end detection.
- **Groq Whisper Large v3 Turbo**: speech-to-text for listening.
- **Hermes**: reasoning, memory, skills and tools. Media-specific code stays outside Hermes.
- **Deepgram Aura**: primary low-latency realtime TTS.
- **Edge TTS / Piper**: retained by the existing FoxAI TTS service as online/local fallback engines.

## Why Groq Whisper is handled with VAD

Whisper is optimized around audio segments rather than native incremental token streaming. Fox uses Silero VAD with short endpointing delays so completed speech segments are dispatched quickly to Groq. If partial-word live captions become a hard requirement later, the STT adapter can be replaced without changing Hermes.

## Environment

Set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `GROQ_API_KEY`, and `DEEPGRAM_API_KEY`. Optional tuning is available through `VOICE_MIN_ENDPOINT_MS`, `VOICE_MAX_ENDPOINT_MS`, `GROQ_STT_MODEL`, `VOICE_LANGUAGE`, and `DEEPGRAM_TTS_MODEL`.

## Run worker

From `api/agent` after installing `requirements.txt`:

```bash
python -m voice.worker dev
```

The existing FastAPI Hermes service can continue to run independently for REST/text clients.
