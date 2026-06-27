# OpenAI APIs — Entity Extraction and Q&A

## What OpenAI is used for

This project uses OpenAI only for **text generation** — reading text and producing structured output or answers. It does **not** use OpenAI for embeddings; those come from HuggingFace (see [embeddings.md](embeddings.md)).

| API | Model | Job |
|---|---|---|
| Chat Completions API | `gpt-4o-mini` | Extract entities from uploaded documents |
| Chat Completions API | `gpt-4o-mini` | Answer questions using retrieved graph context |

Same API key, same `openai` Python library, two different prompt styles.

---

## Chat Completions API — Entity Extraction

### What it does
Reads the uploaded document text and returns structured JSON identifying concepts and their relationships. This is the core of the ingestion pipeline.

### The call (from `services/extractor.py`)
```python
from openai import AsyncOpenAI

_client = AsyncOpenAI(api_key=settings.openai_api_key)

response = await _client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    response_format={"type": "json_object"},
)
raw = json.loads(response.choices[0].message.content or "{}")
```

### The prompt instructs the model to return:
```json
{
  "nodes": [{"name": "...", "type": "concept|tool|person|organization|idea", "summary": "..."}],
  "edges": [{"from_name": "...", "to_name": "...", "relation": "uses|part_of|contrasts_with|leads_to|created_by|mentions"}]
}
```

### Key facts
- **`response_format={"type": "json_object"}`** — forces JSON output. Without this, the model might wrap JSON in markdown code blocks or add extra text.
- Only the first **8000 characters** of the document are sent to the model (the `_EXTRACTION_CHAR_LIMIT` constant) to stay within token limits.
- Extracted nodes are validated with Pydantic models (`ExtractedNode`, `ExtractedEdge`) before writing to Neo4j.
- Node types allowed: `concept`, `tool`, `person`, `organization`, `idea`
- Relation types allowed: `uses`, `part_of`, `contrasts_with`, `leads_to`, `created_by`, `mentions`

---

## Chat Completions API — Q&A (RAG)

### What it does
Answers a user question using retrieved graph context as grounding.

### The call (from `services/rag.py`)
```python
response = await _client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {
            "role": "system",
            "content": (
                "You are a knowledgeable assistant with access to a company knowledge graph. "
                "Answer the user's question using ONLY the context provided below. "
                "If the context does not contain enough information, say so clearly. "
                "Be concise and factual."
            ),
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}",
        },
    ],
)
answer = response.choices[0].message.content or ""
```

### Key facts
- **Grounded answers** — by including graph context in the prompt, the model answers from your knowledge graph, not from its training data
- The context string is built from all retrieved nodes' `name`, `type`, and `content` fields
- Context is capped at **6000 characters** (`_CONTEXT_CHAR_LIMIT` in `rag.py`) before being sent to the model

---

## Why gpt-4o-mini?

- Fast response times — important for an interactive UI
- Cheap — entity extraction + Q&A at company knowledge base scale costs cents per day
- Capable enough — for extracting structured entities from text and answering questions from provided context, it performs well

---

## Authentication

One API key for both jobs. Set as `OPENAI_API_KEY` in `.env`. Loaded via `config.py` (pydantic-settings) and passed explicitly: `AsyncOpenAI(api_key=settings.openai_api_key)`.

---

*Last updated: 2026-06-28*
