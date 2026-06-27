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

For an AI backend that makes async calls to OpenAI and Neo4j, FastAPI is the right tool.

---

## The structure in this project

```python
# main.py — the entry point
from fastapi import FastAPI
from routers import ingest, query

app = FastAPI()
app.include_router(ingest.router)
app.include_router(query.router)
```

```python
# routers/ingest.py — one endpoint
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class IngestRequest(BaseModel):
    text: str
    source: str | None = None
    type: str = "concept"
    topic: str

@router.post("/ingest")
async def ingest_text(request: IngestRequest):
    # FastAPI automatically:
    # - parses the JSON body
    # - validates it against IngestRequest
    # - returns a 422 if anything is wrong
    result = await some_service(request)
    return result
```

---

## Key FastAPI features we use

### Automatic API docs
Navigate to `http://localhost:8000/docs` while the server is running. FastAPI generates an interactive Swagger UI where you can test every endpoint without writing any code. Every new endpoint shows up here automatically.

### Pydantic validation
Define a `BaseModel` class, decorate your route with it, and FastAPI validates every request automatically. Missing fields, wrong types — all caught before your code even runs.

### Async by default
All route handlers use `async def`. This means FastAPI can handle many requests simultaneously while waiting for OpenAI or Neo4j to respond, instead of blocking on each call.

### Dependency injection
FastAPI has a `Depends()` system for sharing things like database connections across routes:

```python
from fastapi import Depends

async def get_db():
    driver = get_neo4j_driver()
    try:
        yield driver
    finally:
        await driver.close()

@router.get("/nodes")
async def get_nodes(driver = Depends(get_db)):
    # driver is automatically provided and cleaned up
    ...
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

## The two routers in this project

| Router | File | Endpoint | Job |
|---|---|---|---|
| Ingest | `routers/ingest.py` | `POST /ingest` | Takes text, extracts entities, writes to Neo4j |
| Query | `routers/query.py` | `POST /query` | Takes a question, runs Graph-RAG, returns answer |

---

*Last updated: 2026-06-27*
