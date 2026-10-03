# Fox — Personal Voice Assistant

Fox is a JARVIS-inspired voice assistant with a React HUD, realtime LiveKit
voice transport, Hermes-based agent orchestration, cloud and local model
providers, and independently deployable data services.

## Container architecture

The backend runs as one Compose project with eight services (six core, two optional). Every
service joins the private `fox-network` bridge and reaches other services by
Compose DNS name.

The web app is not containerized during development. It runs locally with
`npm run dev` on port 3000 and proxies `/api` to the API published on
`localhost:3001`. A web container will be added once the UI is ready to ship.

```text
Browser
   |
   v
web :3000 (local) ──>  api :3001
                         |  |
                         |  └────────> voice :8200 (Edge/Piper TTS)
                         └───────────> hermes :8000
                                          ^    |
                                          |    └── MCP ──> mcp-server :8100/mcp ──> postgres :5432
LiveKit <──────────── voice ──────────────┘

Optional extended data services:
api / mcp-server ──> neo4j :7687
api / mcp-server ──> minio :9000

Telemetry (OpenTelemetry traces, metrics, logs):
api, hermes, mcp-server, voice ──> observability :4318 ──> Grafana :3100
```

| Service | Responsibility | Runtime | Default state |
|---|---|---|---|
| `web` | HUD, chat, settings, browser audio, LiveKit client, planned Picovoice wake word | React 19 + Vite | Local (not in Compose) |
| `api` | Public REST boundary, LiveKit tokens, provider routing, future WebSocket streaming | Node.js + Express | Core |
| `hermes` | Long-running tasks and orchestration with upstream Nous Research Hermes, Agent Reach web research | Hermes gateway | Core |
| `mcp-server` | Fox's own tools served to Hermes over MCP | MCP Python SDK | Core |
| `voice` | VAD, speech recognition, realtime turn handling, TTS; HTTP Edge/Piper speech for the API on :8200 | LiveKit Agents + aiohttp | Core |
| `postgres` | Relational state and vector search | PostgreSQL 16 + pgvector | Core |
| `observability` | Traces, metrics, and logs from every service, with Grafana dashboards on :3100 | Grafana LGTM (OTel Collector, Tempo, Loki, Prometheus, Pyroscope) | Core |
| `neo4j` | Entities, relationships, and knowledge graph | Neo4j Community | `extended` profile |
| `minio` | Audio, documents, images, and model artifacts | MinIO | `extended` profile |

Neo4j and MinIO are defined but do not start unless the `extended` profile is
selected. The data client libraries are installed; application persistence and
repository adapters are still implementation work.

## Repository layout

```text
fox-jarvis-inspiration/
├── app/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── tests/                      Frontend regression and stress suites
├── api/                        api container (Node.js + Express)
│   ├── Dockerfile
│   ├── package.json
│   └── package-lock.json
├── agents/                     hermes container (upstream Hermes only)
│   ├── hermes/
│   │   ├── config.yaml         Model, Fox MCP server, tool settings
│   │   └── SOUL.md             Fox persona + web-search policy
│   └── agent-reach/
│       └── install.sh          Adds Agent Reach to Hermes as a skill
├── mcp-server/                 mcp-server container (Fox MCP tools)
│   ├── Dockerfile
│   ├── main.py                 /mcp (tools), /health
│   └── tools/                  reminder, note, device, calculator, system
├── voice/                      voice container (all speech)
│   ├── Dockerfile
│   ├── start.sh                Starts local_tts + worker.py
│   ├── worker.py               LiveKit realtime voice worker
│   ├── tts/                    Edge/Piper engines + piper_models/
│   └── local_tts/              HTTP Edge/Piper speech for the API (:8200)
├── deploy/
│   ├── env/                    Per-service environment templates
│   └── docker/                 agents.Dockerfile (+ its .dockerignore)
├── docker-compose.yml          Backend service orchestration
└── PROJECT.md                  Architecture decisions and implementation status
```

Every container has its own top-level folder and build context. The hermes
container runs only upstream Hermes and its built-in OpenAI-compatible API
server (`POST /v1/chat/completions` on :8000); `agents/` contains no Fox code,
only configuration. Fox's own tools live in `mcp-server` and reach Hermes over
MCP (`FOX_MCP_URL`). There is no fallback agent.

The api and voice services call Hermes with `HERMES_GATEWAY_KEY`, which
Compose also gives Hermes as `API_SERVER_KEY`. It defaults to a dev-only value;
set `HERMES_GATEWAY_KEY` in a root `.env` file for anything beyond local use.

All speech code lives in `voice/tts`. The LiveKit worker uses it for
realtime voice, and `voice/local_tts/` serves it over HTTP for the
"Voice Edge" and "Voice Piper" options in the app's normal (non-LiveKit)
voice mode.

There is intentionally no root npm workspace. The web and API services own
their manifests and lockfiles. Run package commands from the relevant service
directory; `npm install <package>` updates that service's manifest and lockfile.
Docker images use `npm ci` for reproducible dependency installation.

## Environment configuration

Each backend service has its own template under `deploy/env`. The local web
app uses `app/.env.example` instead (copy it to `app/.env`).

```text
api.env.example
hermes.env.example
voice.env.example
postgres.env.example
neo4j.env.example
minio.env.example
observability.env.example
```

Copy a template to the same name without `.example`, then add values only for
that service. Real `*.env` files are ignored by Git.

```bash
for file in deploy/env/*.env.example; do
  cp "$file" "${file%.example}"
done
```

Important secrets include the LiveKit credentials, model-provider keys,
database passwords, and MinIO credentials. Never place secrets in `VITE_*`
variables because those values are bundled into browser code.

## Docker commands

No image is built or container started merely by cloning the repository.

Start the six core backend services, then run the web app locally:

```bash
docker compose up --build
cd app && npm run dev
```

Include Neo4j and MinIO:

```bash
docker compose --profile extended up --build
```

Stop the project without deleting persistent data:

```bash
docker compose down
```

Named volumes preserve PostgreSQL, Neo4j, MinIO, observability data, Agent
Reach state, and container-local JavaScript dependencies.

## Observability

The `observability` container (Grafana's `otel-lgtm` image) receives
OpenTelemetry data on `:4317` (gRPC) and `:4318` (HTTP) and stores traces in
Tempo, logs in Loki, and metrics in Prometheus. Open Grafana at
http://localhost:3100 and log in with the credentials from
`deploy/env/observability.env` (admin/admin, with a forced password change, if
that file is missing).

Every service is auto-instrumented and reports under its own service name:

| Service name | Source | How |
|---|---|---|
| `fox-api` | api | `@opentelemetry/auto-instrumentations-node`, loaded via `NODE_OPTIONS` |
| `fox-hermes` | hermes | `opentelemetry-instrument` around `hermes gateway run` |
| `hermes-gateway` | hermes | Hermes' built-in gateway health metrics and logs (`monitoring:` in `agents/hermes/config.yaml`) |
| `fox-mcp-server` | mcp-server | `opentelemetry-instrument` |
| `fox-voice` / `fox-voice-tts` | voice | `opentelemetry-instrument`, one name per process (`voice/start.sh`) |

Trace context is propagated over HTTP, so a chat request appears in Tempo as
one trace: `fox-api` → `fox-hermes` (including its model calls) →
`fox-mcp-server` tool calls. The shared settings live in the `x-otel` block
of `docker-compose.yml`; set `OTEL_SDK_DISABLED=true` in a root `.env` to turn
telemetry off.

## Local development without Docker

Install and run each JavaScript service independently:

```bash
cd app
npm install
npm run dev
```

Run the frontend regression suites from the same independent package:

```bash
cd app
npm test
npm run test:notse
```

```bash
cd api
npm install
npm run dev
```

Run the MCP server independently:

```bash
cd mcp-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Hermes is configuration only, so run it in Docker:
`docker compose up --build hermes`.

The voice worker uses its own dependency set:

```bash
cd voice
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python worker.py dev
```

## Current integration notes

- Vite remains the frontend build system. Browser-only microphone and future
  Picovoice wake-word code must remain client-rendered.
- The API delegates heavy work to `http://hermes:8000` and calls TTS on
  `http://voice:8200` inside Compose.
- The voice worker delegates heavy work to the same hermes service.
- PostgreSQL includes pgvector support, but schema migrations and
  `CREATE EXTENSION vector` initialization still need to be added.
- There is no local-model container. The API's "local" models
  (`api/services/localLlm.service.ts`) call an external endpoint set by
  `OWN_LLM_BASE_URL`.
- Neo4j and MinIO are optional until their repository adapters are connected.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | New chat session |
| `Cmd+B` / `Ctrl+B` | Toggle sidebar |
| `Cmd+,` / `Ctrl+,` | Open settings |
