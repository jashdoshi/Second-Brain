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

*(No entries yet — they will appear here as the project runs into problems and solves them.)*

---

## Common gotchas to watch for (pre-emptive)

These haven't happened yet but are known traps in this stack:

### Neo4j: CREATE vs MERGE
Using `CREATE` instead of `MERGE` when writing nodes creates duplicates on every ingest.  
**Always use `MERGE`.**

### Neo4j: vector index must exist before querying
If you call `db.index.vector.queryNodes()` before the index is created, you get a cryptic error.  
**Create the index on startup (idempotent with `IF NOT EXISTS`).**

### OpenAI: JSON mode requires "json" in the prompt
When using `response_format={"type": "json_object"}`, the model requires the word "JSON" to appear somewhere in the system prompt — otherwise it throws an error.  
**Always mention "Return JSON" in the system prompt when using JSON mode.**

### FastAPI: async route calling sync Neo4j driver
If you use the synchronous Neo4j driver (`GraphDatabase.driver`) inside an `async def` route, it blocks the event loop.  
**Always use `AsyncGraphDatabase.driver` in this project.**

### react-force-graph-3d: SSR incompatibility
The 3D graph library uses `window` and WebGL — it crashes in server-side rendering environments.  
**This is a pure client-side component. Never server-render it.**

---

*Last updated: 2026-06-27*
