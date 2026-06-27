# AGENTS.md — Second Brain: Knowledge Graph AI

This file is read at the start of every Codex session.
Do not delete or rename it. Update it as the project evolves.

---

## What this project is

A company document knowledge graph tool. Companies have dozens of documents
scattered across drives — client proposals, call recordings, contracts, reports —
with many interrelated concepts buried inside them. This tool ingests PDF, DOCX,
and MD files, extracts entities and relationships using GPT-4o-mini, and stores
them as nodes and edges in Neo4j. Each source document is also stored as a node,
so cross-document relationships are visible. Nodes are embedded with a local
HuggingFace sentence transformer (no API cost). The frontend renders the graph
in 3D and includes a chat interface where users can query the knowledge base.
The AI answers by combining vector search and graph traversal (Graph-RAG), then
highlights the relevant nodes in the 3D view. An MCP server exposes the graph
as callable tools.

---

## Architecture decisions (already made — do not question these)

- **Backend**: Python + FastAPI
- **Database**: Neo4j AuraDB (handles both graph storage and vector search)
- **Embeddings**: HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (384 dims, runs locally)
- **LLM**: OpenAI `gpt-4o-mini` (entity extraction + Q&A)
- **MCP server**: lives inside the FastAPI app, not a separate service
- **Frontend**: React + `react-force-graph-3d`
- **Backend deployment**: Railway
- **Frontend deployment**: Vercel
- **Local dev database**: Neo4j via Docker (`docker-compose.yml` in root)
- **No ChromaDB** — Neo4j handles vector search natively via vector indexes

---

## Project structure

```
second-brain/
├── backend/
│   ├── main.py               # FastAPI app, registers all routers
│   ├── config.py             # loads env vars via pydantic-settings
│   ├── routers/
│   │   ├── ingest.py         # POST /ingest (multipart file upload)
│   │   ├── query.py          # POST /query
│   │   └── graph_router.py   # GET /graph
│   ├── services/
│   │   ├── embedder.py       # HuggingFace sentence transformer singleton
│   │   ├── extractor.py      # file parsing + GPT-4o-mini entity extraction
│   │   ├── graph.py          # all Neo4j read/write operations
│   │   ├── rag.py            # vector search + graph traversal + LLM answer
│   │   └── mcp.py            # MCP server tool definitions
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── GraphCanvas.jsx   # react-force-graph-3d wrapper
│   │       ├── ChatPanel.jsx     # chat sidebar + streaming responses
│   │       └── AddNote.jsx       # ingestion form + AI preview
│   └── package.json
├── docker-compose.yml        # runs Neo4j locally for dev only
├── AGENTS.md                 # this file
├── README.md
└── glossary/                 # learning reference — see glossary/README.md for index
    ├── README.md             # index of all glossary files
    ├── project-overview.md
    ├── tech-stack.md
    ├── neo4j.md
    ├── fastapi.md
    ├── openai-apis.md
    ├── embeddings.md
    ├── graph-rag.md
    ├── knowledge-graph.md
    ├── mcp.md
    ├── react-force-graph.md
    └── problems-and-solutions.md
```

Do not create new files outside this structure without a clear reason.
Do not add subfolders (e.g. `utils/`, `helpers/`, `hooks/`) unless
genuinely needed — ask first.

---

## Environment variables

All secrets live in `.env` (gitignored). Never hardcode them.
The `.env.example` file lists all required keys with placeholder values.

```
OPENAI_API_KEY=sk-...
NEO4J_URI=neo4j+s://...        # AuraDB connection URI
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
```

In `config.py`, load these with `pydantic-settings`:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    openai_api_key: str
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str

    class Config:
        env_file = ".env"

settings = Settings()
```

On Railway, these are set as environment variables in the dashboard.
Do not create a `.env` file in the Railway environment.

---

## Key data models

### Node (concept in the graph)
```python
{
  "id": "uuid",
  "name": "RAG",              # short label shown on graph
  "type": "concept",          # document | concept | idea | tool
  "content": "full text...",  # source text this node was extracted from
  "source": "filename or url",  # optional
  "embedding": [0.02, ...]    # 384-dim vector from all-MiniLM-L6-v2
}
```

Document nodes (type="document") store the filename as `name` and full
extracted text as `content`. Every concept node extracted from a document
has a `SOURCED_FROM` edge pointing back to its document node.

### Edge (relationship between nodes)
```python
{
  "from_id": "uuid",
  "to_id": "uuid",
  "relation": "uses"          # uses | part_of | contrasts_with | leads_to | stored_in
}
```

### /ingest request (multipart form)
```
file: UploadFile  (.pdf, .docx, or .md)
source: str       (optional URL or description — form field)
```

### /query request body
```python
{
  "question": "how does RAG connect to embeddings?"
}
```

### /query response
```python
{
  "answer": "...",
  "source_node_ids": ["uuid1", "uuid2", "uuid3"]  # for graph highlighting
}
```

---

## Service responsibilities

### extractor.py
Two responsibilities:
1. `parse_file(upload_file) -> str` — extracts raw text from PDF (`pypdf`),
   DOCX (`python-docx`), or MD (native read).
2. `extract_entities(text) -> ExtractedGraph` — calls `gpt-4o-mini` with
   `response_format={"type": "json_object"}`. Prompt instructs the model to return:
```json
{
  "nodes": [{"name": "...", "type": "concept", "summary": "..."}],
  "edges": [{"from": "...", "to": "...", "relation": "uses"}]
}
```
Parse with `json.loads()`. Validate with Pydantic models.

### embedder.py
Singleton loader for `SentenceTransformer("all-MiniLM-L6-v2")`.
- `embed(text: str) -> list[float]` — single text embedding (384 dims)
- `embed_batch(texts: list[str]) -> list[list[float]]` — batch embedding

### graph.py
All Neo4j operations. Use the official `neo4j` Python driver.
Key operations:
- `create_node(node)` — use `MERGE` not `CREATE` to avoid duplicates
- `create_edge(from_id, to_id, relation)` — use `MERGE` on the relationship too
- `get_all_nodes()` — for the frontend graph fetch
- `get_neighbors(node_id, depth=2)` — for MCP tool + RAG context
- `find_path(node_a, node_b)` — shortest path via Cypher `shortestPath()`
- `vector_search(embedding, top_k=5)` — uses Neo4j's built-in vector index

Neo4j vector index must be created once on startup (idempotent):
```cypher
CREATE VECTOR INDEX node_embeddings IF NOT EXISTS
FOR (n:Node) ON (n.embedding)
OPTIONS {indexConfig: {`vector.dimensions`: 384, `vector.similarity_function`: 'cosine'}}
```
384 dimensions matches `all-MiniLM-L6-v2`. Do NOT use 1536 (that was the OpenAI model).

### rag.py
The query pipeline — three steps in sequence:
1. Embed the question with `embedder.embed(question)`
2. Vector search in Neo4j → top 5 semantically similar nodes
3. For each seed node, fetch 2-hop neighbors from Neo4j (graph context)
4. Build a context string from all retrieved nodes
5. Call `gpt-4o-mini` with the question + context → answer
6. Return answer + list of source node IDs used

### mcp.py
Three tools exposed as MCP server endpoints:
- `search_nodes(query: str)` — embeds query, returns top matching nodes
- `get_neighbors(node_id: str)` — returns connected nodes up to depth 2
- `find_path(concept_a: str, concept_b: str)` — shortest path between two nodes

Use the `mcp` Python package. Mount the MCP server onto the FastAPI app.

---

## Frontend behaviour

### GraphCanvas.jsx
- Fetches `GET /graph` on mount to load all nodes and edges
- Renders with `react-force-graph-3d`
- Node color: white if in `highlightedIds`, grey otherwise
- Node size: based on connection count (more connections = larger)
- On node click: calls `onNodeSelect(node)` to open detail panel

### ChatPanel.jsx
- Sends `POST /query` with the user's question
- Streams the response if the backend supports SSE, otherwise shows on completion
- After receiving response, calls `onHighlight(source_node_ids)` to light up nodes
- Displays source node tags below each AI answer

### AddNote.jsx
- File upload input accepting `.pdf,.docx,.md`
- Sends `POST /ingest` as `multipart/form-data` (file + optional source field)
- Two-step: first call returns extracted entities preview, second call confirms and writes to graph
- Shows filename + extracted entity count in the preview step
- After successful ingest, refetches the graph to show new nodes

---

## Coding conventions

### Python
- Type hint every function signature
- Use Pydantic models for all request/response bodies — no raw dicts
- Use `async def` for all route handlers and service functions
- Handle Neo4j connections with a context manager or dependency injection
- Never print secrets or embeddings to logs
- Keep each service function under ~30 lines — split if longer

### React
- Functional components only, no class components
- One component per file, filename matches component name
- Use `useState` and `useEffect` — no Redux or Zustand needed at this scale
- All API calls go through a single `api.js` file in `src/` — no inline fetch calls in components
- No inline styles — use a single `App.css` with CSS variables for theming

### General
- No `TODO` comments left in committed code
- Every new endpoint must be testable via the FastAPI `/docs` UI
- Git commit messages: `phase-N: short description` (e.g. `phase-2: add ingest endpoint`)

---

## Python packages (requirements.txt)

```
fastapi
uvicorn[standard]
pydantic
pydantic-settings
openai
neo4j
python-dotenv
pypdf
python-docx
sentence-transformers
python-multipart
mcp
```

---

## Local development

```bash
# 1. Start Neo4j
docker compose up -d

# 2. Start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Start frontend
cd frontend
npm install
npm run dev
```

Backend runs on http://localhost:8000
FastAPI docs at http://localhost:8000/docs
Frontend runs on http://localhost:5173

---

## Build phases (for orientation)

| Phase | What gets built |
|-------|----------------|
| 1 | Environment setup — all services running and pingable |
| 2 | Ingestion pipeline — /ingest endpoint writes nodes to Neo4j |
| 3 | Graph-RAG query engine — /query returns grounded answers with source IDs |
| 4 | MCP server — 3 tools callable from Codex Desktop |
| 5 | 3D frontend — graph renders, chat works, nodes highlight on query |
| 6 | Deploy — Railway (backend) + Vercel (frontend) + AuraDB (prod DB) |

Complete one phase fully before starting the next.
When starting a session, state which phase you are in.

---

## What Codex should never do

- Never install packages not in `requirements.txt` without asking first
- Never use `print()` for debugging in production paths — use Python `logging`
- Never store the OpenAI API key or Neo4j password anywhere in code
- Never create a `.env` file (it is gitignored and must be created manually)
- Never add a frontend CSS framework (Tailwind, Bootstrap, etc.) — not needed
- Never use `any` type in Python — always be specific
- Never write a Cypher `CREATE` when `MERGE` is correct (causes duplicate nodes)

---

## Self-Learning Protocol

This project is a learning journey. Every problem solved is a lesson captured.

### When a bug or problem is resolved, Codex MUST:
1. Add a dated entry to the **Learned Rules** section below
2. Decide if the lesson is general enough to also add to the glossary (`glossary/problems-and-solutions.md`)
3. If the problem taught something important about a technology (e.g. how Neo4j vector indexes work), add or update the relevant glossary concept file too

### When Codex encounters something worth knowing about the project, it MUST:
- Add a brief note to the relevant glossary file
- If no glossary file fits, create a new one and add it to the glossary index (`glossary/README.md`)
- Keep all glossary entries **simplified** — explain as if to someone encountering the concept for the first time

### Glossary lives at: `glossary/`
See `glossary/README.md` for the full index of what's documented.

---

## Learned Rules

> Auto-updated whenever Codex fixes a bug or solves a problem in this project.
> Format: date · what went wrong · the rule going forward.

<!-- New entries go at the TOP of this list so the most recent is always visible first -->

---

## Learned Rules — Project-Specific

> Auto-updated by Codex when errors are resolved.

<!-- TEMPLATE (copy when adding a new entry):
### [YYYY-MM-DD] Short Title
**Root cause:** one sentence describing what went wrong
**Rule:** what Codex must do or avoid going forward
**Glossary:** link to the glossary entry if one was created/updated
-->

### [2026-06-27] Neo4j Cypher — no parameters in variable-length path ranges
**Root cause:** Neo4j does not allow query parameters (`$depth`) inside variable-length path range patterns. `[*1..$depth]` is a `CypherSyntaxError`.
**Rule:** Always inline numeric bounds directly into the Cypher string using an f-string. Use `f"[*1..{depth}]"` not `[*1..$depth]`, and pass only `id` (not `depth`) as a parameter to `session.run()`.
