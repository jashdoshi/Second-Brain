# Glossary — Second Brain Project

This folder is your personal reference library for everything you've built and learned in this project. Each file covers one topic: what it is, why we use it, how it fits, and any gotchas we hit along the way.

**This is a living document.** Claude adds to it automatically as the project grows.

---

## Index

### The Big Picture
- [project-overview.md](project-overview.md) — What the project is, what it does, the full journey from note to graph to answer

### Tech Stack (what each tool is and why we picked it)
- [tech-stack.md](tech-stack.md) — Every technology used, explained simply
- [neo4j.md](neo4j.md) — Graph database: nodes, edges, Cypher, vector indexes
- [fastapi.md](fastapi.md) — Python web framework: routes, async, Pydantic
- [openai-apis.md](openai-apis.md) — GPT-4o-mini for entity extraction and Q&A (embeddings come from HuggingFace, not OpenAI)
- [react-force-graph.md](react-force-graph.md) — 3D graph rendering in the browser

### Core Concepts (the ideas that power the project)
- [graph-rag.md](graph-rag.md) — How we answer questions using both vector search and graph traversal
- [embeddings.md](embeddings.md) — What embeddings are and why they make search smarter
- [knowledge-graph.md](knowledge-graph.md) — What a knowledge graph is vs a normal database
- [mcp.md](mcp.md) — Model Context Protocol: exposing the graph as AI-callable tools

### Problems & Solutions
- [problems-and-solutions.md](problems-and-solutions.md) — Every bug we hit, what caused it, and how we fixed it

---

> To add a new file: create it in this folder and add a line to the index above.
