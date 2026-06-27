# FastAPI — The Python Web Framework

## What is it?

FastAPI is the framework that makes the backend work. It handles:
- Receiving HTTP requests (from the frontend or from you via the browser)
- Routing them to the right Python function
- Validating inputs
- Sending back responses

If your backend were a restaurant, FastAPI is the host — it greets every request, checks the reservation (validates input), and leads it to the right table (function).

---

## Why FastAPI over Flask or Django?

| | FastAPI | Flask | Django |
|---|---|---|---|
| Async support | Native | Bolt-on | Complex |
| Auto API docs | Yes (Swagger) | No | No (DRF has some) |
| Type safety | Built-in via Pydantic | Manual | Manual |
| Speed | Very fast | Slower | Slowest |
| Learning curve | Low-medium | Low | High |

For an AI backend that makes async calls to OpenAI, FastAPI is the right tool.

---

## The structure in this project

```python
# main.py — the entry point
from fastapi import FastAPI
from routers import graph_router, ingest, query

app = FastAPI(title="Second Brain API", lifespan=lifespan)
app.include_router(ingest.router)
app.include_router(query.router)
app.include_router(graph_router.router)
```

```python
# routers/ingest.py — file upload endpoint
from fastapi import APIRouter, Form, UploadFile
from pydantic import BaseModel

router = APIRouter()

class IngestPreviewResponse(BaseModel):
    document_id: str
    filename: str
    node_count: int
    edge_count: int
    nodes: list[dict]
    edges: list[dict]
    committed: bool

@router.post("/ingest", response_model=IngestPreviewResponse)
async def ingest_document(
    file: UploadFile,
    source: str = Form(default=""),
    commit: bool = Form(default=False),
) -> IngestPreviewResponse:
    # FastAPI automatically:
    # - parses the multipart/form-data body
    # - validates the UploadFile and form fields
    # - returns a 422 if anything is wrong
    ...
```

Note: `/ingest` takes a **file upload** (`multipart/form-data`), not a JSON body. The `commit` flag controls whether the result is written to Neo4j or just previewed.

---

## Key FastAPI features we use

### Automatic API docs
Navigate to `http://localhost:8000/docs` while the server is running. FastAPI generates an interactive Swagger UI where you can test every endpoint without writing any code. Every new endpoint shows up here automatically.

### Pydantic validation
Define a `BaseModel` class, decorate your route with it, and FastAPI validates every request automatically. Missing fields, wrong types — all caught before your code even runs.

### Async by default
All route handlers use `async def`. This means FastAPI can handle many requests simultaneously while waiting for OpenAI to respond, instead of blocking on each call.

### Lifespan events
The app uses a `lifespan` context manager to run startup code (ensuring the Neo4j vector index exists) before accepting any traffic:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    graph.ensure_vector_index()  # runs on startup
    yield
    # cleanup would go here

app = FastAPI(lifespan=lifespan)
```

---

## Running the server

```bash
uvicorn main:app --reload
```

- `main` = the filename (`main.py`)
- `app` = the FastAPI instance inside that file
- `--reload` = auto-restarts when you save a file (dev only, never in production)

---

## The three routers in this project

| Router | File | Endpoint(s) | Job |
|---|---|---|---|
| Ingest | `routers/ingest.py` | `POST /ingest` | Upload file, extract entities, optionally write to Neo4j |
| Query | `routers/query.py` | `POST /query` | Ask a question, run Graph-RAG, return grounded answer |
| Graph | `routers/graph_router.py` | `GET /graph`, `DELETE /graph` | Fetch all nodes+edges for the frontend; clear the graph |

---

*Last updated: 2026-06-28*
