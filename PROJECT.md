# Fox Jarvis Project Architecture

## Architecture objective

Fox Jarvis is moving from three coupled containers to eight independently
deployable services. The design keeps one Compose project and one shared
network while giving every runtime its own dependency boundary, environment
file, health policy, and persistent storage where applicable.

## Service chain

```text
                         +----------------+
                         |   local-llm    |
                         |     Ollama     |
                         +-------^--------+
                                 |
+---------+      +---------+     |      +----------------+
| browser |----->|   web   |---->| api  |-----> postgres |
+---------+      |  Vite   |     |Node  |      | pgvector |
                 +---------+     +--+----+      +----------------+
                                    |
                                    v
                              +-----------+
                              |   agent   |
                              | FastAPI + |
                              |  Hermes   |
                              +-----^-----+
                                    |
                              +-----+-----+
                              |   voice   |<----> LiveKit
                              | VAD/STT/  |
                              | LLM/TTS   |
                              +-----------+

Extended profile: api/agent ----> neo4j
                  api/agent ----> minio
```

All services are members of `fox-network`. Internal calls use service names,
never host `localhost`:

- Web to API: `http://api:3001`
- API or voice to agent: `http://agent:8000`
- API or agent to PostgreSQL: `postgres:5432`
- API or agent to Ollama: `http://local-llm:11434`
- Graph access: `bolt://neo4j:7687`
- Object storage: `http://minio:9000`

## Service ownership

### Web

- Owns the React 19 and Vite browser application.
- Owns client-side microphone, LiveKit, HUD, canvas, local storage, and future
  Picovoice Porcupine integration.
- Must never receive server secrets through `VITE_*` variables.
- Owns `app/package.json`, `app/package-lock.json`, and `app/Dockerfile`.
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

### Agent

- Owns FastAPI, upstream Hermes orchestration, tools, Agent Reach, workflows,
  and long-running delegated tasks.
- Uses `api/agent/Dockerfile.agent` and `requirements.agent.txt`.
- Has independent data clients for PostgreSQL/pgvector, Neo4j, and MinIO.
- Future capabilities include MCP, Graphiti, workers, and telemetry emitters.

### Voice

- Owns realtime voice transport and turn lifecycle only.
- Uses LiveKit Agents, Silero VAD, Groq Whisper, the realtime session model,
  and Edge/Piper/Deepgram TTS.
- Delegates heavy or multi-step tasks to the agent over HTTP.
- Uses `api/agent/Dockerfile.voice` and `requirements.voice.txt`; it no longer
  installs or runs Hermes.

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

### Local LLM

- Ollama runtime for local inference, embeddings, and offline fallback.
- Model files persist in the `ollama-data` named volume.
- The TypeScript adapter still needs conversion from its earlier custom
  `/chat` endpoint to Ollama's `/api/chat` request and response format.

## Environment ownership

Environment templates live in `deploy/env`. A service receives only the
configuration and credentials it needs.

| Template | Main contents |
|---|---|
| `web.env.example` | Public browser configuration and Picovoice setting |
| `api.env.example` | API runtime, origins, provider keys, LiveKit token credentials |
| `agent.env.example` | Hermes model/runtime and agent provider keys |
| `voice.env.example` | LiveKit, STT, session model, and TTS settings |
| `postgres.env.example` | Database, username, and password |
| `neo4j.env.example` | Neo4j authentication |
| `minio.env.example` | MinIO root credentials |
| `local-llm.env.example` | Ollama runtime limits |

Real environment files are ignored by Git. Secrets must not be copied into
Compose labels, source code, committed templates, or browser-visible values.

## Dependency policy

- There is no root npm workspace or root package lock.
- Run `npm install <package>` from `app` or `api`; npm updates that service's
  `package.json` and `package-lock.json`.
- Docker uses `npm ci`, which fails when a manifest and lockfile disagree.
- Python dependencies are split into agent and voice requirements files.
- Database server images do not replace application client libraries; the
  relevant client remains owned by the service that calls the database.

## Persistence and network policy

Named volumes isolate persistent state:

| Volume | Data |
|---|---|
| `postgres-data` | Relational and vector data |
| `neo4j-data` | Graph data |
| `minio-data` | Object blobs |
| `ollama-data` | Local model files |
| `agent-reach-data` | Agent Reach state |
| `web-node-modules` | Web container dependencies |
| `api-node-modules` | API container dependencies |

Only ports needed for development are published to the host. Production
deployment should place a reverse proxy in front of the web and API services
and avoid publishing database ports publicly.

## Current implementation status

| Area | Status | Notes |
|---|---|---|
| Eight Compose service definitions | Done | All share `fox-network` |
| Independent web/API manifests and lockfiles | Done | Root workspace removed |
| Independent agent and voice images | Done | Separate Dockerfiles and requirements |
| Per-service environment templates | Done | Real values remain uncommitted |
| Neo4j and MinIO optional profile | Done | Defined but not started by default |
| PostgreSQL schema and migrations | Pending | Add migration ownership and pgvector init |
| API data repositories | Pending | Connect installed database clients |
| Ollama adapter | Pending | Align environment name and `/api/chat` protocol |
| Picovoice wake word | Pending | Packages declared; browser integration remains |
| WebSocket/message stream | Pending | Client declared; transport design remains |
| MCP, Graphiti, and telemetry | Planned | Add only with concrete workflows |
| Production hardening | Planned | Secrets, TLS, reverse proxy, resource limits, pinned images |

## Delivery phases

1. Validate the independent images and health checks without enabling optional
   services.
2. Add PostgreSQL migrations, pgvector initialization, and repository tests.
3. Align the Ollama adapter and explicitly provision approved local models.
4. Integrate browser-side Picovoice while preserving the existing wake-word
   fallback.
5. Add Neo4j and MinIO adapters behind feature flags, then enable the
   `extended` profile only where required.
6. Add message streaming and observability after service boundaries and data
   contracts are stable.

## Existing application features

The container refactor does not remove the current Fox UI or tools. The React
application still contains the holographic interface, conversations, settings,
voice controls, notes workspace, reminders, weather, device controls, and
planetarium-related test suites. The notes editor currently persists primarily
through browser storage; moving that state into PostgreSQL is a separate data
migration task.
