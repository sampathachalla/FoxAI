# Fox Jarvis Project Architecture

## Architecture objective

Fox Jarvis is moving from three coupled containers to independently
deployable services. During development the web app runs locally (outside
Compose); the remaining eight services are containers. The design keeps one Compose project and one shared
network while giving every runtime its own dependency boundary, environment
file, health policy, and persistent storage where applicable.

## Service chain

```text
+---------+      +---------+      +------+      +----------------+
| browser |----->|   web   |----->| api  |----->|    postgres    |
+---------+      | (local) |      | Node |      |    pgvector    |
                 +---------+      +--+---+      +----------------+
                                    |
                                    v
                              +-----------+   MCP    +------------+
                              |  hermes   |--------->| mcp-server |
                              | upstream  |          | Fox tools, |
                              |  Hermes   |          |  Edge/Piper|
                              +-----^-----+          +------------+
                                    |
                              +-----+-----+
                              |   voice   |<----> LiveKit
                              | VAD/STT/  |
                              | LLM/TTS   |
                              +-----------+

Extended profile: api/mcp-server ----> neo4j
                  api/mcp-server ----> minio
```

All services are members of `fox-network`. Internal calls use service names,
never host `localhost`:

- Web (local Vite proxy) to API: `http://localhost:3001`
- API or voice to Hermes: `http://hermes:8000`
- Hermes to Fox tools (MCP Streamable HTTP): `http://mcp-server:8100/mcp`
- API to Edge/Piper TTS: `http://voice:8200/tts/*`
- API or mcp-server to PostgreSQL: `postgres:5432`
- All services to telemetry (OTLP/HTTP): `http://observability:4318`
- Graph access: `bolt://neo4j:7687`
- Object storage: `http://minio:9000`

## Service ownership

### Web

- Owns the React 19 and Vite browser application.
- Owns client-side microphone, LiveKit, HUD, canvas, local storage, and future
  Picovoice Porcupine integration.
- Must never receive server secrets through `VITE_*` variables.
- Runs locally with `npm run dev` during development; it is not a Compose
  service. `app/Dockerfile` is kept for containerizing it after development.
- Owns `app/package.json`, `app/package-lock.json`, and `app/.env.example`.
- Owns the planetarium, UI-state, notes, and adversarial suites under
  `app/tests` and `app/components/notse/__tests__`.
- A future Next.js migration may server-render suitable pages, but microphone
  and wake-word components will remain client-rendered.

### API

- Public entry point for browser requests.
- Owns REST routes, CORS, LiveKit token generation, provider routing, and
  future WebSocket or message-stream endpoints.
- Owns Node clients for PostgreSQL/pgvector, Neo4j, MinIO-compatible S3, and
  WebSocket transport.
- Owns `api/package.json`, `api/package-lock.json`, and `api/Dockerfile`.

### Hermes

- Runs only upstream Nous Research Hermes (cloned at build time, pinned by
  `HERMES_UPSTREAM_REF`) via `hermes gateway run`, using Hermes' built-in
  OpenAI-compatible API server: `POST /v1/chat/completions`, `GET /health`.
- Callers authenticate with `Authorization: Bearer <HERMES_GATEWAY_KEY>`;
  Compose passes the same value to Hermes as `API_SERVER_KEY`.
- Lives in `agents/` and holds no Fox code: `hermes/config.yaml` (model, MCP server, tool settings), `hermes/SOUL.md`
  (Fox persona and Agent Reach search policy), and `agent-reach/install.sh`. Its image is built from
  `deploy/docker/agents.Dockerfile` with `agents/` as the build context.
- `config.yaml` registers the Fox MCP server (`FOX_MCP_URL`), so Fox's tools
  appear as the `mcp-fox` toolset.
- Has no fallback agent; failed runs come back with `hermes.failed: true`.
- Future capabilities include Graphiti, workers, and telemetry emitters.

### MCP server

- Serves Fox's own tools (reminder, note, device, calculator, system status)
  to Hermes over MCP at `/mcp`.
- Lives in `mcp-server/`, built on the MCP Python SDK (`mcp==2.0.0`, the
  version Hermes pins).
- Owns the data clients for PostgreSQL/pgvector, Neo4j, and MinIO for future
  data-backed tools.

### Voice

- Owns realtime voice transport and turn lifecycle only.
- Uses LiveKit Agents, Silero VAD, Groq Whisper, the realtime session model,
  and Edge/Piper/Deepgram TTS.
- Delegates heavy or multi-step tasks to Hermes over HTTP.
- Lives in `voice/` with its own `Dockerfile` and `requirements.txt`; it does
  not install or run Hermes.
- Owns all speech code (`voice/tts`) and the Piper voice models
  (`voice/tts/piper_models`). Besides the LiveKit worker, `start.sh` runs
  `local_tts/server.py`, which serves Edge/Piper speech over HTTP on :8200 for the
  app's "Voice Edge" and "Voice Piper" options (via the API).

### PostgreSQL and pgvector

- Primary transactional store for sessions, settings, notes, reminders, and
  other durable application state.
- Vector store for embeddings and semantic retrieval.
- Uses one PostgreSQL container because pgvector is an extension, not a
  separate database server.
- Requires migrations and vector-extension initialization before application
  persistence is considered complete.

### Neo4j

- Optional knowledge-graph store for entities and relationships.
- Runs only with the Compose `extended` profile.
- Must remain optional until a concrete graph-backed feature is connected.

### MinIO

- Optional S3-compatible object storage for recordings, images, documents,
  exports, and model artifacts.
- Runs only with the Compose `extended` profile.
- Must remain optional until upload and retention policies are implemented.

### Observability

- One container (`grafana/otel-lgtm`): OpenTelemetry Collector, Tempo (traces),
  Loki (logs), Prometheus (metrics), Pyroscope (profiles), and Grafana on
  host port 3100. Data persists in the `observability-data` volume.
- Collection only; every other service carries its own instrumentation and
  reports under its own service name (`fox-api`, `fox-hermes`,
  `hermes-gateway`, `fox-mcp-server`, `fox-voice`, `fox-voice-tts`).
- Shared OTLP settings live in the `x-otel` block of `docker-compose.yml`.
- Grafana login comes from `deploy/env/observability.env`; anonymous access is
  disabled.
- No local-model container: the Ollama `local-llm` service was removed.

## Environment ownership

Backend environment templates live in `deploy/env`; the local web app uses
`app/.env.example`. A service receives only the
configuration and credentials it needs.

| Template | Main contents |
|---|---|
| `api.env.example` | API runtime, origins, provider keys, LiveKit token credentials |
| `hermes.env.example` | Hermes model, provider keys, toolset limits |
| `voice.env.example` | LiveKit, STT, session model, and TTS settings |
| `postgres.env.example` | Database, username, and password |
| `neo4j.env.example` | Neo4j authentication |
| `minio.env.example` | MinIO root credentials |
| `observability.env.example` | Grafana admin login |

Real environment files are ignored by Git. Secrets must not be copied into
Compose labels, source code, committed templates, or browser-visible values.

## Dependency policy

- There is no root npm workspace or root package lock.
- Run `npm install <package>` from `app` or `api`; npm updates that service's
  `package.json` and `package-lock.json`.
- Docker uses `npm ci`, which fails when a manifest and lockfile disagree.
- Python dependencies are split into hermes, mcp-server, and voice requirements files.
- Database server images do not replace application client libraries; the
  relevant client remains owned by the service that calls the database.

## Persistence and network policy

Named volumes isolate persistent state:

| Volume | Data |
|---|---|
| `postgres-data` | Relational and vector data |
| `neo4j-data` | Graph data |
| `minio-data` | Object blobs |
| `observability-data` | Traces, logs, metrics, Grafana state |
| `agent-reach-data` | Agent Reach state |
| `api-node-modules` | API container dependencies |

Only ports needed for development are published to the host. Production
deployment should place a reverse proxy in front of the web and API services
and avoid publishing database ports publicly.

## Current implementation status

| Area | Status | Notes |
|---|---|---|
| Eight Compose service definitions | Done | All share `fox-network`; web runs locally |
| Independent web/API manifests and lockfiles | Done | Root workspace removed |
| One folder per container | Done | `api/`, `agents/`, `mcp-server/`, `voice/` each own their Dockerfile and dependencies |
| Hermes-only agent with MCP tools | Done | Fallback agent removed; Fox tools served over MCP |
| Per-service environment templates | Done | Real values remain uncommitted |
| Neo4j and MinIO optional profile | Done | Defined but not started by default |
| PostgreSQL schema and migrations | Pending | Add migration ownership and pgvector init |
| API data repositories | Pending | Connect installed database clients |
| Picovoice wake word | Pending | Packages declared; browser integration remains |
| WebSocket/message stream | Pending | Client declared; transport design remains |
| Observability | Done | OpenTelemetry from every service into Grafana LGTM |
| Graphiti | Planned | Add only with concrete workflows |
| Web container | Planned | Production build (`npm run build` + static server) after UI development |
| Production hardening | Planned | Secrets, TLS, reverse proxy, resource limits, pinned images |

## Delivery phases

1. Validate the independent images and health checks without enabling optional
   services.
2. Add PostgreSQL migrations, pgvector initialization, and repository tests.
3. Integrate browser-side Picovoice while preserving the existing wake-word
   fallback.
4. Add Neo4j and MinIO adapters behind feature flags, then enable the
   `extended` profile only where required.
5. Add message streaming after service boundaries and data contracts are
   stable.

## Existing application features

The container refactor does not remove the current Fox UI or tools. The React
application still contains the holographic interface, conversations, settings,
voice controls, notes workspace, reminders, weather, device controls, and
planetarium-related test suites. The notes editor currently persists primarily
through browser storage; moving that state into PostgreSQL is a separate data
migration task.
