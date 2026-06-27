# Graph-RAG — How We Answer Questions

## What is RAG?

**RAG = Retrieval Augmented Generation**

The idea: instead of asking an LLM to answer from memory (which can hallucinate), you first *retrieve* relevant facts, then *augment* the LLM's prompt with those facts, then let it *generate* an answer grounded in what you retrieved.

Think of it as open-book exam vs closed-book exam. RAG gives the LLM the textbook open in front of it.

---

## What makes it *Graph*-RAG?

Standard RAG retrieves documents using vector similarity — find the top-5 most similar chunks of text.

**Graph-RAG** adds a second retrieval step: after finding similar nodes via vector search, we also explore the *graph neighborhood* around those nodes. This captures knowledge that is *connected* to the topic but might not be semantically close in embedding space.

Example:
- You ask: "What is backpropagation used for?"
- Vector search finds: the "Backpropagation" node
- Graph traversal also finds: "Neural Networks" → "Training" → "Gradient Descent" → "Loss Function"
- The LLM now has the full connected context, not just one isolated node

---

## Our exact pipeline (step by step)

```
1. User asks: "How does RAG connect to embeddings?"

2. Embed the question (locally via HuggingFace)
   question_embedding = embedder.embed("How does RAG connect to embeddings?")
   # → list of 384 floats

3. Vector search in Neo4j
   seed_results = graph.vector_search(question_embedding, top_k=5)
   # → ["RAG", "Vector Search", "Embeddings", "Similarity", "Retrieval"] nodes

4. Graph expansion (2-hop neighbors)
   for each seed_node:
       neighbors = graph.get_neighbors(seed_node["id"], depth=2)
   # Adds connected concepts like "Neo4j", "Cosine Similarity", "GPT-4o-mini"

5. Build context string
   context = _build_context(list(all_nodes.values()))
   # Truncated at 6000 chars to stay within LLM token limits

6. Call GPT-4o-mini
   answer = await _call_llm(question, context)
   # System prompt: "Answer using ONLY the context provided below."

7. Return answer + source node IDs and names
   return RAGResponse(
       answer=answer,
       source_node_ids=seed_ids,
       source_node_names=seed_names
   )
```

The code lives in `backend/services/rag.py`. The key function is `answer(question: str) -> RAGResponse`.

---

## Why this beats regular RAG

| Regular RAG | Graph-RAG (ours) |
|---|---|
| Retrieves isolated text chunks | Retrieves connected concept clusters |
| Misses related concepts with different wording | Follows explicit relationships in the graph |
| Context is a flat list of documents | Context includes "X uses Y, Y is part of Z" structure |
| Answer quality depends entirely on vector similarity | Answer quality benefits from both semantic AND structural proximity |

---

## The highlighting connection

The `source_node_ids` returned in the `/query` response are what the frontend uses to highlight the relevant nodes in the 3D graph. The `ChatPanel` calls `onHighlight(source_node_ids)` after each query, and `App.jsx` passes the highlighted set to `GraphCanvas` to change node colors.

---

## Related concepts
- [embeddings.md](embeddings.md) — how the vector search part works (HuggingFace, 384 dims)
- [neo4j.md](neo4j.md) — how the graph traversal part works
- [openai-apis.md](openai-apis.md) — the GPT-4o-mini call that generates the final answer

---

*Last updated: 2026-06-28*
