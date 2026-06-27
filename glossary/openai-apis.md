# OpenAI APIs — Embeddings and GPT-4o-mini

## Two separate APIs, two separate jobs

This project uses OpenAI for two completely different tasks:

| API | Model | Job |
|---|---|---|
| Embeddings API | `text-embedding-3-small` | Turn text into a vector (for search) |
| Chat Completions API | `gpt-4o-mini` | Extract entities from text / answer questions |

Same API key, same `openai` Python library, very different calls.

---

## Embeddings API

### What it does
Takes text, returns a list of 1536 numbers representing the meaning of that text.

### The call
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=settings.openai_api_key)

response = await client.embeddings.create(
    model="text-embedding-3-small",
    input="your text here"
)
embedding = response.data[0].embedding  # list of 1536 floats
```

### Key facts
- **1536 dimensions** — fixed for `text-embedding-3-small`
- **One-way** — you can't reconstruct the original text from the embedding
- **Used twice** — once when ingesting (embed the node content), once when querying (embed the question)
- See [embeddings.md](embeddings.md) for the full explanation of what embeddings are

---

## Chat Completions API — Entity Extraction

### What it does
Reads the user's pasted text and returns structured JSON identifying concepts and their relationships.

### The call
```python
response = await client.chat.completions.create(
    model="gpt-4o-mini",
    response_format={"type": "json_object"},  # forces JSON output
    messages=[
        {
            "role": "system",
            "content": """You are a knowledge extraction assistant.
            Extract concepts and relationships from the text.
            Return JSON with this exact structure:
            {
              "nodes": [{"name": "...", "type": "concept|paper|idea|tool", "summary": "..."}],
              "edges": [{"from": "...", "to": "...", "relation": "uses|part_of|contrasts_with|leads_to|stored_in"}]
            }"""
        },
        {"role": "user", "content": user_text}
    ]
)
result = json.loads(response.choices[0].message.content)
```

### Key facts
- **`response_format={"type": "json_object"}`** — tells the model to always return valid JSON. Without this, the model might wrap JSON in markdown code blocks or add extra text.
- The system prompt must explicitly list the allowed relationship types — otherwise the model invents its own
- Parse with `json.loads()` then validate with Pydantic models

---

## Chat Completions API — Q&A (RAG)

### What it does
Answers a user question using retrieved graph context as grounding.

### The call
```python
response = await client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {
            "role": "system",
            "content": "Answer the question using only the knowledge graph context provided. Be concise."
        },
        {
            "role": "user",
            "content": f"Context:\n{context_string}\n\nQuestion: {question}"
        }
    ]
)
answer = response.choices[0].message.content
```

### Key facts
- **Grounded answers** — by including context in the prompt, the model answers from your knowledge graph, not from its training data
- The context string is built from the retrieved nodes' `content` fields, formatted as readable text

---

## Why gpt-4o-mini?

- Fast response times — important for an interactive UI
- Cheap — entity extraction + Q&A at personal use scale costs cents per day
- Capable enough — for extracting structured entities from text and answering questions from provided context, it performs well

---

## Authentication

One API key for both. Set as `OPENAI_API_KEY` in `.env`. The library picks it up automatically from `AsyncOpenAI(api_key=settings.openai_api_key)`.

---

*Last updated: 2026-06-27*
