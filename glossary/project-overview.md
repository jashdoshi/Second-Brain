# Project Overview — Second Brain

## What is this project?

A **company document knowledge graph** — a tool that ingests your files (PDFs, DOCX, Markdown) and turns them into a connected, queryable map of ideas.

Most document tools store files as a flat list. This project stores the *concepts inside them* as a **graph**: concepts become nodes and the relationships between them become edges. You can then ask questions in plain English and the AI finds the answer by navigating the graph.

---

## The journey of a document

Here's what happens when you upload a file:

```
You upload a PDF / DOCX / MD file
      ↓
The backend extracts plain text from the file
      ↓
GPT-4o-mini reads it and extracts:
  - concepts (nodes): e.g. "RAG", "Vector Search", "Neo4j"
  - relationships (edges): e.g. "RAG uses Vector Search"
      ↓
A preview is shown (you confirm before anything is written)
      ↓
Each concept gets an embedding (a list of 384 numbers that captures its meaning)
using HuggingFace all-MiniLM-L6-v2 — runs locally, no API cost
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
Your question gets turned into an embedding (same 384-number format, same local model)
      ↓
Neo4j finds the 5 nodes whose embeddings are most similar to your question
      ↓
For each of those nodes, we also grab their neighbors in the graph (2 hops away)
      ↓
All that context gets fed to GPT-4o-mini with your question
      ↓
GPT answers using only what's in your knowledge graph
      ↓
The relevant nodes light up in the 3D view
```

This combination of vector search + graph traversal is called **Graph-RAG**.

---

## Why this architecture?

| Decision | Why |
|---|---|
| Neo4j instead of a regular database | Relationships between ideas are first-class citizens. A regular SQL database would need complex joins to do what Neo4j does natively. |
| Neo4j for vector search too | Avoids needing a separate tool like Pinecone or ChromaDB. One database handles both graph queries and similarity search. |
| HuggingFace for embeddings | Runs locally — zero API cost per embed. `all-MiniLM-L6-v2` produces 384-dim vectors, well-supported by Neo4j's vector index. |
| GPT-4o-mini instead of GPT-4o | Fast and cheap. Good enough for entity extraction and Q&A over a company knowledge base. |
| FastAPI | Async Python web framework. Clean, fast, automatic API docs at `/docs`. |
| React + react-force-graph-3d | Rendering a 3D interactive graph in the browser without writing WebGL from scratch. |

---

## Build phases

| Phase | What you built | Status |
|---|---|---|
| 1 | Environment — Neo4j running, backend starts, frontend loads | Complete |
| 2 | Ingestion — `/ingest` extracts entities and writes them to Neo4j | Complete |
| 3 | Query — `/query` returns AI answers grounded in your graph | Complete |
| 4 | MCP server — 3 tools Claude Desktop can call to explore the graph | Not started |
| 5 | 3D frontend — full UI with graph rendering, chat, node detail, and settings | Complete |
| 6 | Deploy — Railway (backend) + Vercel (frontend) + AuraDB (production database) | Not started |

---

*Last updated: 2026-06-28*
