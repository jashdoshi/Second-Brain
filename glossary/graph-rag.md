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

2. Embed the question
   question_embedding = openai.embed("How does RAG connect to embeddings?")
   # → list of 1536 floats

3. Vector search in Neo4j
   seed_nodes = neo4j.vector_search(question_embedding, top_k=5)
   # → ["RAG", "Vector Search", "Embeddings", "Similarity", "Retrieval"]

4. Graph expansion (2-hop neighbors)
   for each seed_node:
       neighbors = neo4j.get_neighbors(seed_node.id, depth=2)
   # Adds connected concepts like "Neo4j", "Cosine Similarity", "GPT-4o-mini"

5. Build context string
   context = format_nodes_as_text(seed_nodes + all_neighbors)

6. Call GPT-4o-mini
   prompt = f"""
   Answer this question using only the knowledge graph context below.
   
   Context: {context}
   Question: {question}
   """
   answer = gpt4o_mini.complete(prompt)

7. Return answer + source node IDs
   return {"answer": answer, "source_node_ids": [node.id for node in used_nodes]}
```

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

The `source_node_ids` returned in the `/query` response are what the frontend uses to light up the relevant nodes white in the 3D graph. The user can literally *see* which concepts were used to generate the answer.

---

## Related concepts
- [embeddings.md](embeddings.md) — how the vector search part works
- [neo4j.md](neo4j.md) — how the graph traversal part works
- [openai-apis.md](openai-apis.md) — the GPT-4o-mini call that generates the final answer

---

*Last updated: 2026-06-27*
