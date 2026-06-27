# MCP — Model Context Protocol

## What is it?

MCP (Model Context Protocol) is a standard way to expose tools that AI assistants (like Claude) can call.

Without MCP, Claude is limited to what it knows from training. With MCP, you can connect Claude to *your own data and services* — in this case, your knowledge graph.

---

## The analogy

Think of MCP like a USB standard. Instead of every device needing a custom cable, everything uses USB. MCP is the "USB" for AI tools — instead of every AI needing a custom integration with every tool, they all speak MCP.

---

## Current status

**Phase 4 (MCP server) has not been built yet.** The `mcp` package is listed in `requirements.txt` and the plan is documented here, but `services/mcp.py` does not exist yet.

---

## What we plan to expose via MCP

Three tools, each a function the AI can call:

| Tool | What it does | When the AI uses it |
|---|---|---|
| `search_nodes(query)` | Embeds the query and returns the most similar nodes | "What do I know about X?" |
| `get_neighbors(node_id)` | Returns all nodes connected to a given node (2 hops) | "What's related to this concept?" |
| `find_path(concept_a, concept_b)` | Finds the shortest path between two concepts | "How does X connect to Y?" |

All three operations already exist as functions in `services/graph.py` — the MCP layer just exposes them as callable tools.

---

## How MCP will work in this project

The MCP server will not be a separate service — it will be mounted directly onto the FastAPI app. This is a deliberate architectural decision: one deployed service instead of two.

```python
# services/mcp.py (planned — not yet implemented)
from mcp.server import Server

mcp_server = Server("second-brain")

@mcp_server.tool()
async def search_nodes(query: str) -> list[dict]:
    """Find nodes semantically similar to the query."""
    embedding = embedder.embed(query)
    return graph.vector_search(embedding, top_k=5)

@mcp_server.tool()
async def get_neighbors(node_id: str) -> list[dict]:
    """Get all nodes connected to the given node within 2 hops."""
    return graph.get_neighbors(node_id, depth=2)

@mcp_server.tool()
async def find_path(concept_a: str, concept_b: str) -> list[dict]:
    """Find the shortest path between two concepts in the graph."""
    return graph.find_path(concept_a, concept_b)
```

---

## How to use it from Claude Desktop (once built)

Once the backend is deployed and the MCP endpoint is configured in Claude Desktop settings, Claude can call these tools mid-conversation.

Example exchange:
```
You: "What's in my knowledge graph about RAG?"
Claude: [calls search_nodes("RAG")]
        [gets back: RAG, Vector Search, Embeddings, Retrieval, LLM nodes]
Claude: "Your graph has 5 concepts related to RAG: ..."
```

---

## Why build this?

1. **Portfolio value** — MCP integration is a real-world skill that demonstrates understanding of how modern AI tooling works
2. **Practical use** — you can query your own knowledge graph through Claude Desktop without opening the web UI
3. **AI-native data access** — the knowledge graph becomes a tool the AI *uses*, not just data it reads

---

## MCP vs REST API

| | MCP Tools | REST API |
|---|---|---|
| Called by | AI assistants (Claude) | Humans via browser/frontend |
| Format | Tool schema + JSON | HTTP + JSON |
| Discovery | AI reads tool descriptions | Developer reads API docs |
| Use case | AI-driven workflows | Human-driven UI |

We have both planned — the REST API powers the web frontend, the MCP server will power Claude Desktop integration.

---

*Last updated: 2026-06-28*
