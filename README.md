<div align="center">
<img width="1200" height="475" alt="Fox Jarvis" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Fox — Personal Voice Assistant

**Fox** is a JARVIS-inspired intelligent voice assistant featuring a dynamic audio-reactive holographic HUD, real-time voice synthesis via Deepgram Aura, multi-session management, and AI-powered tools — all with a Fox Cyan (`#99FFFF`) theme.

---

## Architecture

```
fox-jarvis-inspiration/
├── app/          React + Vite + Tailwind CSS frontend (port 3000)
├── api/          Node.js + Express REST API (port 3001)
│   ├── agent/    Python FastAPI Hermes Agent microservice (port 8000)
│   └── services/ Gemini, OpenAI, Deepgram integrations
```

The frontend proxies all `/api` requests to the Node.js backend. The backend tries the Python Hermes agent first and falls back to the TypeScript Gemini/OpenAI service.

---

## Required API Keys

Configure these in `api/.env` (copy from `api/.env.example`):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini 2.0 Flash (primary AI engine) |
| `OPENAI_API_KEY` | OpenAI GPT-4o-mini (optional, used if present) |
| `DEEPGRAM_API_KEY` | Deepgram Aura-2 text-to-speech voice synthesis |

---

## Run Locally

**Prerequisites:** Node.js 20+, Python 3.11+ (for the agent microservice)

```bash
# 1. Install dependencies (both app + api workspaces)
npm install

# 2. Copy and fill in environment variables
cp api/.env.example api/.env
# edit api/.env with your actual API keys

# 3. Start both frontend and API server
npm run dev
# → App: http://localhost:3000
# → API: http://localhost:3001
```

To also run the Python Hermes Agent microservice:

```bash
cd api/agent
pip install -r requirements.txt
python main.py
# → Agent: http://localhost:8000
```

---

## Run with Docker Compose

```bash
docker compose up --build
# → App:   http://localhost:3000
# → API:   http://localhost:3001
# → Agent: http://localhost:8000
```

> Add your API keys to `api/.env` before running Docker Compose.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | New chat session |
| `⌘B` / `Ctrl+B` | Toggle sidebar |
| `⌘,` / `Ctrl+,` | Open settings |
