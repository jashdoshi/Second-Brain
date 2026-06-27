# Project Overview — Second Brain

## What is this project?

A **personal knowledge graph** — a tool that turns your notes and reading into a connected, queryable map of ideas.

Most note-taking apps store your notes as a flat list. This project stores them as a **graph**: concepts become dots (nodes) and the relationships between them become lines (edges). You can then ask questions in plain English and the AI finds the answer by navigating the graph.

---

## The journey of a note

Here's what happens when you paste text into the app:

```
You paste text
      ↓
GPT-4o-mini reads it and extracts:
  - concepts (nodes): e.g. "RAG", "Vector Search", "Neo4j"
  - relationships (edges): e.g. "RAG uses Vector Search"
      ↓
Each concept gets an embedding (a list of 1536 numbers that captures its meaning)
      ↓
Everything is stored in Neo4j (the graph database)
      ↓
The 3D graph in your browser updates to show the new nodes and connections
```

---

## The journey of a question

Here's what happens when you type a question:

```
You ask: "How does RAG connect to embeddings?"
      ↓
Your question gets turned into an embedding (same 1536-number format)
      ↓
Neo4j finds the 5 nodes whose embeddings are most similar to your question
      ↓
For each of those nodes, we also grab their neighbors in the graph (2 hops away)
      ↓
All that context gets fed to GPT-4o-mini with your question
      ↓
GPT answers using only what's in your knowledge graph
      ↓
The relevant nodes light up white in the 3D view
```

This combination of vector search + graph traversal is called **Graph-RAG**.

---

## Why this architecture?

| Decision | Why |
|---|---|
| Neo4j instead of a regular database | Relationships between ideas are first-class citizens. A regular SQL database would need complex joins to do what Neo4j does natively. |
| Neo4j for vector search too | Avoids needing a separate tool like Pinecone or ChromaDB. One database handles both graph queries and similarity search. |
| GPT-4o-mini instead of GPT-4o | Fast and cheap. Good enough for entity extraction and Q&A over a personal knowledge base. |
| FastAPI | Async Python web framework. Clean, fast, automatic API docs at `/docs`. |
| React + react-force-graph-3d | Rendering a 3D interactive graph in the browser without writing WebGL from scratch. |

---

## Build phases

| Phase | What you built |
|---|---|
| 1 | Environment — Neo4j running, backend starts, frontend loads |
| 2 | Ingestion — `/ingest` extracts entities and writes them to Neo4j |
| 3 | Query — `/query` returns AI answers grounded in your graph |
| 4 | MCP server — 3 tools Claude Desktop can call to explore the graph |
| 5 | 3D frontend — full UI with graph rendering, chat, and node highlighting |
| 6 | Deploy — Railway (backend) + Vercel (frontend) + AuraDB (production database) |

---

*Last updated: 2026-06-27*
