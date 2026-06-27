# Problems & Solutions

Every bug, gotcha, and unexpected behavior we ran into — and exactly how we fixed it.

This file is auto-updated by Claude whenever a problem is solved. Most recent entries are at the top.

---

## How to read these entries

Each entry has:
- **What happened** — the symptom you'd see
- **Root cause** — why it actually happened
- **Fix** — what changed
- **Lesson** — the rule going forward

---

<!-- New entries go at the TOP -->

## [2026-06-27] Neo4j Cypher: no parameters in variable-length path ranges

**What happened:** `CypherSyntaxError` when running a neighbor query with a parameterized depth.

**Root cause:** Neo4j does not allow query parameters (`$depth`) inside variable-length path range patterns. `[*1..$depth]` is invalid Cypher syntax, even though `$depth` works fine everywhere else.

**Fix:** Inline the depth value directly into the Cypher string using an f-string:
```python
# WRONG
cypher = "MATCH (n)-[*1..$depth]-(neighbor) WHERE n.id = $id RETURN neighbor"
session.run(cypher, id=node_id, depth=2)  # CypherSyntaxError

# RIGHT
cypher = f"MATCH (n)-[*1..{depth}]-(neighbor) WHERE n.id = $id RETURN neighbor"
session.run(cypher, id=node_id)  # only pass 'id', not 'depth'
```

**Lesson:** Numeric bounds in `[*m..n]` Cypher patterns must be literal integers in the query string. Only node/relationship properties can be passed as parameters.

---

## Common gotchas to watch for

### Neo4j: CREATE vs MERGE
Using `CREATE` instead of `MERGE` when writing nodes creates duplicates on every ingest.  
**Always use `MERGE`.**

### Neo4j: vector index must exist before querying
If you call `db.index.vector.queryNodes()` before the index is created, you get a cryptic error.  
**Create the index on startup (idempotent with `IF NOT EXISTS`). This is done in `main.py`'s `lifespan` handler via `graph.ensure_vector_index()`.**

### Neo4j: vector index dimensions must match the embedding model
The vector index is created with `vector.dimensions: 384` to match `all-MiniLM-L6-v2`. If you change the embedding model to one with different dimensions (e.g. OpenAI's 1536), you must drop and recreate the index.  
**Never change the embedding model without also updating the vector index configuration.**

### OpenAI: JSON mode requires "json" in the prompt
When using `response_format={"type": "json_object"}`, the model requires the word "JSON" to appear somewhere in the prompt — otherwise it throws an error.  
**Always mention "Return JSON" or "JSON object" in the prompt when using JSON mode.**

### FastAPI: sync Neo4j driver inside async routes
This project uses the synchronous `GraphDatabase.driver` from the `neo4j` package. This works because the graph operations are called from within async route handlers but the driver itself is synchronous — it blocks briefly during the call but this is acceptable for our use case.  
**Do not switch to `AsyncGraphDatabase.driver` without careful testing — the async driver requires different session management patterns.**

### HuggingFace model: truncate before embedding
`all-MiniLM-L6-v2` has a 256-token limit. Passing very long text silently produces a degraded embedding.  
**Always truncate input to ~1500 characters before calling `embedder.embed()`. This is handled inside `embedder.py`.**

### react-force-graph-3d: SSR incompatibility
The 3D graph library uses `window` and WebGL — it crashes in server-side rendering environments.  
**This is a pure client-side component. Never server-render it.**

---

*Last updated: 2026-06-28*
