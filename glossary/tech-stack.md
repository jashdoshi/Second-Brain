# Tech Stack

Every tool used in this project, explained simply.

---

## Backend

### Python
The programming language for the backend. Chosen because:
- Best-in-class AI/ML libraries
- Clean async support via `asyncio`
- The OpenAI and Neo4j SDKs have excellent Python clients

### FastAPI
A Python web framework that handles HTTP requests. Think of it as the receptionist for your backend — it receives requests, routes them to the right function, and sends back responses.

Key things it gives you:
- **Automatic API docs** at `http://localhost:8000/docs` — you can test every endpoint in the browser without writing any extra code
- **Pydantic integration** — input/output types are validated automatically
- **Async support** — handles many requests at once without blocking

### Pydantic
A Python library for defining data shapes with types. Instead of passing raw dictionaries around, you define a `class IngestRequest(BaseModel)` and Pydantic validates that every request matches that shape. If a field is missing or the wrong type, it returns a clear error.

### pydantic-settings
The same idea applied to environment variables. You define a `Settings` class with all the env vars your app needs. If any are missing at startup, the app refuses to start — which is exactly what you want (fail fast, not silently).

### Uvicorn
The server that actually runs your FastAPI app. FastAPI is a framework (the rules), Uvicorn is the engine (the runner). You always start your app with `uvicorn main:app --reload`.

---

## Database

### Neo4j
A **graph database** — see [neo4j.md](neo4j.md) for a full explanation. The core data store for this project. Stores nodes (concepts), edges (relationships), and embeddings (for vector search) all in one place.

### Neo4j AuraDB
The cloud-hosted version of Neo4j. Used in production. Zero setup — you get a connection URI, username, and password. For local dev we run Neo4j ourselves via Docker.

---

## AI

### OpenAI text-embedding-3-small
Turns text into a list of 1536 numbers (an "embedding") that captures the meaning of the text. Two pieces of text about similar topics will have embeddings that are numerically close to each other. This is what powers semantic search. See [embeddings.md](embeddings.md).

### OpenAI GPT-4o-mini
The language model used for two jobs:
1. **Entity extraction** — reading your pasted text and pulling out concepts + relationships as structured JSON
2. **Q&A** — answering your questions using retrieved graph context as grounding

gpt-4o-mini is fast and cheap. For a personal knowledge base, it's more than capable.

---

## Frontend

### React
A JavaScript library for building UIs. We use functional components with hooks (`useState`, `useEffect`). No class components, no Redux — kept deliberately simple.

### react-force-graph-3d
A React component that renders a 3D interactive graph in the browser using WebGL (via Three.js under the hood). You give it an array of nodes and links, it handles the physics simulation and rendering. See [react-force-graph.md](react-force-graph.md).

---

## Infrastructure

### Docker / docker-compose
Used only for local development to run Neo4j without installing it directly. `docker compose up -d` starts a Neo4j instance with the right ports and configuration.

### Railway
Cloud platform for deploying the FastAPI backend. You push code, it builds the Docker container and runs it. Environment variables are set in the Railway dashboard.

### Vercel
Cloud platform for deploying the React frontend. Connects to your GitHub repo, automatically builds and deploys on every push to main.

---

## Developer Tools

### MCP (Model Context Protocol)
A protocol for exposing tools that AI assistants like Claude can call. We expose three tools: search nodes, get neighbors, find path. See [mcp.md](mcp.md).

---

*Last updated: 2026-06-27*
