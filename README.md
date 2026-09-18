# Fox — Personal Voice Assistant

Fox is a JARVIS-inspired voice assistant with a React HUD, realtime LiveKit
voice transport, Hermes-based agent orchestration, cloud and local model
providers, and independently deployable data services.

## Container architecture

The project uses one Compose project with eight independent services. Every
service joins the private `fox-network` bridge and reaches other services by
Compose DNS name.

```text
Browser
   |
   v
web :3000  ───────>  api :3001
                         |  |  \
                         |  |   └────> local-llm :11434
                         |  └────────> postgres :5432
                         └───────────> agent :8000
                                          ^
                                          |
LiveKit <──────────── voice ──────────────┘

Optional extended data services:
api / agent ───────> neo4j :7687
api / agent ───────> minio :9000
```

| Service | Responsibility | Runtime | Default state |
|---|---|---|---|
| `web` | HUD, chat, settings, browser audio, LiveKit client, planned Picovoice wake word | React 19 + Vite | Core |
| `api` | Public REST boundary, LiveKit tokens, provider routing, future WebSocket streaming | Node.js + Express | Core |
| `agent` | Long-running tasks, Hermes orchestration, tools, Agent Reach | Python + FastAPI | Core |
| `voice` | VAD, speech recognition, realtime turn handling, TTS | LiveKit Agents | Core |
| `postgres` | Relational state and vector search | PostgreSQL 16 + pgvector | Core |
| `local-llm` | Local inference and offline fallback | Ollama | Core |
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
├── api/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── agent/
│       ├── Dockerfile.agent
│       ├── Dockerfile.voice
│       ├── requirements.agent.txt
│       └── requirements.voice.txt
├── deploy/env/                 Per-service environment templates
├── docker-compose.yml          Eight-service orchestration
└── PROJECT.md                  Architecture decisions and implementation status
```

There is intentionally no root npm workspace. The web and API services own
their manifests and lockfiles. Run package commands from the relevant service
directory; `npm install <package>` updates that service's manifest and lockfile.
Docker images use `npm ci` for reproducible dependency installation.

## Environment configuration

Each service has its own template under `deploy/env`:

```text
web.env.example
api.env.example
agent.env.example
voice.env.example
postgres.env.example
neo4j.env.example
minio.env.example
local-llm.env.example
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

Start the six core services:

```bash
docker compose up --build
```

Include Neo4j and MinIO:

```bash
docker compose --profile extended up --build
```

Stop the project without deleting persistent data:

```bash
docker compose down
```

Named volumes preserve PostgreSQL, Neo4j, MinIO, Ollama models, Agent Reach
state, and container-local JavaScript dependencies.

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

Run the agent independently:

```bash
cd api/agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.agent.txt
python main.py
```

The voice worker uses its own dependency set:

```bash
cd api/agent
python -m venv .venv-voice
source .venv-voice/bin/activate
pip install -r requirements.voice.txt
python -m agents.voice_agent.worker dev
```

## Current integration notes

- Vite remains the frontend build system. Browser-only microphone and future
  Picovoice wake-word code must remain client-rendered.
- The API delegates heavy work to `http://agent:8000` inside Compose.
- The voice worker delegates heavy work to the same agent service.
- PostgreSQL includes pgvector support, but schema migrations and
  `CREATE EXTENSION vector` initialization still need to be added.
- The current local-model adapter predates the Ollama container API and still
  needs to be aligned with Ollama's `/api/chat` contract.
- Neo4j and MinIO are optional until their repository adapters are connected.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | New chat session |
| `Cmd+B` / `Ctrl+B` | Toggle sidebar |
| `Cmd+,` / `Ctrl+,` | Open settings |
