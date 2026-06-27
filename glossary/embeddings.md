# Embeddings — Turning Words into Numbers

## The problem

Computers don't understand words. They understand numbers. So how do you make a computer understand that "machine learning" and "ML" mean the same thing, or that "RAG" is related to "retrieval"?

**Embeddings** are the answer.

---

## What is an embedding?

An embedding is a list of numbers (a vector) that represents the *meaning* of a piece of text.

In this project, every node gets a 1536-number embedding:
```
"RAG" → [0.02, -0.14, 0.87, 0.03, ..., -0.22]   # 1536 numbers
"Retrieval Augmented Generation" → [0.021, -0.139, 0.869, ...]   # very similar!
"Pizza" → [-0.45, 0.92, -0.11, ...]   # very different
```

The key insight: **similar meanings produce similar numbers**. The distance between two embedding vectors reflects how semantically related the texts are.

---

## How we generate embeddings

We use OpenAI's `text-embedding-3-small` model:

```python
response = await openai_client.embeddings.create(
    model="text-embedding-3-small",
    input="Retrieval Augmented Generation uses vector search"
)
embedding = response.data[0].embedding  # list of 1536 floats
```

- **Model:** `text-embedding-3-small` — fast, cheap, 1536 dimensions
- **Dimensions:** 1536 — each embedding is a list of 1536 floats
- **This is a one-way operation** — you can't reverse an embedding back to text

---

## How we use embeddings for search

When you ask a question, we:
1. Embed the question (same model, same dimensions)
2. Ask Neo4j: "find the nodes whose embeddings are closest to this"
3. "Closest" = smallest angle between vectors (cosine similarity)

This is called **semantic search** — it finds conceptually similar content even if the exact words don't match.

```
Question: "How does AI find relevant documents?"
           ↓ embed
[0.03, -0.12, 0.88, ...]
           ↓ cosine similarity against all stored embeddings
Returns: "RAG", "Vector Search", "Retrieval" nodes — even though none of those
         contain the word "documents"
```

---

## Cosine similarity — why we use it

Two embeddings are "similar" if the **angle** between their vectors is small.

Why angle instead of raw distance? Because we care about *direction* (meaning), not *magnitude* (length of text). A short sentence and a long paragraph about the same topic should be close.

- Cosine similarity of **1.0** = identical meaning
- Cosine similarity of **0.0** = completely unrelated
- Cosine similarity of **-1.0** = opposite meanings

---

## The embedding is stored in Neo4j

Every node in our graph has an `embedding` property — the 1536-float list. This is what the vector index is built on. See [neo4j.md](neo4j.md) for how the vector index works.

---

## Why not just keyword search?

Keyword search only finds exact word matches. Embeddings find *meaning* matches.

| Query | Keyword search finds | Embedding search finds |
|---|---|---|
| "how AI retrieves info" | nothing (no exact match) | RAG, Vector Search, Embeddings |
| "neural nets" | only nodes containing "neural nets" | Deep Learning, Backprop, Transformers |

---

*Last updated: 2026-06-27*
