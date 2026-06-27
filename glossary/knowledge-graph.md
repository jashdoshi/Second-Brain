# Knowledge Graph — What It Is and Why It Matters

## The simplest explanation

A knowledge graph is a way of storing facts as **connections between things**, not as isolated records.

In a normal database:
```
Table: concepts
| id | name | description |
|----|------|-------------|
| 1  | RAG  | A technique for... |
| 2  | Embeddings | A way to... |
```

In a knowledge graph:
```
RAG ──[uses]──► Embeddings
RAG ──[leads_to]──► Better LLM Accuracy
Embeddings ──[part_of]──► Vector Search
Neo4j ──[uses]──► Vector Search
```

The *relationships themselves* carry information that the flat table hides.

---

## Why this matters for a "second brain"

Your real brain doesn't store ideas as a flat list. It stores them as a web of associations. When you think of "RAG", your brain immediately connects it to "retrieval", "LLMs", "search", "vector databases" — because those connections were formed as you learned.

This project mimics that: every document you ingest doesn't just get stored, it gets *connected* to what you already know.

---

## Nodes vs Edges in this project

### Nodes (concepts and documents)

Each **document** node is created when you upload a file:
```python
{
  "id": "stable-uuid-from-filename",  # deterministic, based on filename
  "name": "my-report.pdf",            # the filename
  "type": "document",
  "content": "...",                   # first 5000 chars of extracted text
  "source": "optional url/description",
  "embedding": [...]                  # 384-dim vector from all-MiniLM-L6-v2
}
```

Each **concept** node is extracted from a document by GPT-4o-mini:
```python
{
  "id": "stable-uuid-from-name",  # deterministic, based on concept name
  "name": "RAG",
  "type": "concept",              # concept | tool | person | organization | idea
  "content": "...",               # the summary generated during extraction
  "embedding": [...]              # 384-dim vector
}
```

Concept nodes with the same name are **merged** — if "RAG" appears in two documents, there is only one `RAG` node in the graph (with `SOURCED_FROM` edges to both documents).

### Edges (relationships)

Each edge is a directed relationship between two nodes:
```python
{
  "from_id": "uuid",
  "to_id": "uuid",
  "relation": "uses"   # uses | part_of | contrasts_with | leads_to | created_by | mentions
}
```

There is also a special edge type `SOURCED_FROM` (not user-visible) linking every concept node back to the document it was extracted from.

### The six relationship types

These were chosen to capture the most common ways ideas connect:

| Relation | Example |
|---|---|
| `uses` | RAG uses Vector Search |
| `part_of` | Backprop is part_of Training |
| `contrasts_with` | Fine-tuning contrasts_with RAG |
| `leads_to` | Embeddings leads_to Semantic Search |
| `created_by` | GPT-4 created_by OpenAI |
| `mentions` | Report mentions Client Name |

---

## The graph grows over time

Every document you upload potentially:
1. Adds new concept nodes that didn't exist before
2. Adds new edges (relationships) between existing and new concepts
3. Strengthens the graph — a concept that appears across multiple documents has `SOURCED_FROM` edges to all of them

Over time, the graph becomes a *map of your company's knowledge*. Highly connected nodes are core concepts. Isolated nodes are things mentioned but not deeply connected yet.

---

## What you can do with the graph that you can't do with a list of documents

- **"Show me everything related to X within 2 steps"** — you'd need to read every document manually to do this with regular files
- **"What's the shortest connection path between RAG and Transformers?"** — the graph can compute this instantly
- **"What are my most connected concepts?"** — degree centrality, only possible with a graph
- **"Answer a question grounded in all my documents, following the connections"** — Graph-RAG (see [graph-rag.md](graph-rag.md))

---

*Last updated: 2026-06-28*
