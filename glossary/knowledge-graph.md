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
RAG ──[improves]──► LLM Accuracy
Embeddings ──[stored_in]──► Neo4j
Neo4j ──[supports]──► Vector Search
```

The *relationships themselves* carry information that the flat table hides.

---

## Why this matters for a "second brain"

Your real brain doesn't store ideas as a flat list. It stores them as a web of associations. When you think of "RAG", your brain immediately connects it to "retrieval", "LLMs", "search", "vector databases" — because those connections were formed as you learned.

This project mimics that: every note you ingest doesn't just get stored, it gets *connected* to what you already know.

---

## Nodes vs Edges in this project

### Nodes (concepts)
Each node is a concept extracted from your text:
```python
{
  "name": "RAG",
  "type": "concept",     # concept | paper | idea | tool
  "topic": "rag",        # broad topic bucket
  "content": "...",      # full source text
  "embedding": [...]     # 1536-number meaning vector
}
```

### Edges (relationships)
Each edge is a directed relationship between two concepts:
```python
{
  "from": "RAG",
  "to": "Vector Search",
  "relation": "uses"     # uses | part_of | contrasts_with | leads_to | stored_in
}
```

The five relationship types were chosen to capture the most common ways ideas connect to each other in an AI engineering context.

---

## The graph grows over time

Every note you add potentially:
1. Adds new concept nodes that didn't exist before
2. Adds new edges (relationships) between existing and new concepts
3. Strengthens the graph — a concept that appears across multiple notes becomes more central

Over time, the graph becomes a *map of your knowledge*. Highly connected nodes are your core concepts. Isolated nodes are things you've touched but haven't deeply connected yet.

---

## What you can do with the graph that you can't do with a list of notes

- **"Show me everything related to X within 2 steps"** — you'd need to read every note manually to do this with regular notes
- **"What's the shortest connection path between RAG and Transformers?"** — the graph can compute this instantly
- **"What are my most connected concepts?"** — degree centrality, only possible with a graph
- **"Answer a question grounded in all my notes, following the connections"** — Graph-RAG (see [graph-rag.md](graph-rag.md))

---

*Last updated: 2026-06-27*
