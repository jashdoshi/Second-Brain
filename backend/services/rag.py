import logging
from typing import Any

from openai import AsyncOpenAI
from pydantic import BaseModel

from config import settings
from services import embedder, graph

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key)

# Max characters of context text sent to the LLM in a single /query call.
_CONTEXT_CHAR_LIMIT = 6000


class RAGResponse(BaseModel):
    answer: str
    source_node_ids: list[str]
    source_node_names: list[str]


async def answer(question: str) -> RAGResponse:
    """
    Graph-RAG pipeline:
    1. Embed the question
    2. Vector search → top-5 seed nodes
    3. Expand each seed with 2-hop neighbors
    4. Build context string
    5. Call gpt-4o-mini with context + question
    """
    question_embedding = embedder.embed(question)
    seed_results = graph.vector_search(question_embedding, top_k=5)

    if not seed_results:
        return RAGResponse(
            answer="I could not find any relevant information in the knowledge base.",
            source_node_ids=[],
            source_node_names=[],
        )

    seed_ids = [r["node"]["id"] for r in seed_results]
    seed_names = [r["node"].get("name", r["node"]["id"]) for r in seed_results]
    all_nodes: dict[str, dict[str, Any]] = {
        r["node"]["id"]: r["node"] for r in seed_results
    }

    for seed_id in seed_ids:
        neighbors = graph.get_neighbors(seed_id, depth=2)
        for neighbor in neighbors:
            all_nodes[neighbor["id"]] = neighbor

    context = _build_context(list(all_nodes.values()))
    llm_answer = await _call_llm(question, context)

    return RAGResponse(answer=llm_answer, source_node_ids=seed_ids, source_node_names=seed_names)


def _build_context(nodes: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    total = 0
    for node in nodes:
        name = node.get("name", "")
        content = node.get("content", "")
        node_type = node.get("type", "")
        line = f"[{node_type}] {name}: {content}"
        if total + len(line) > _CONTEXT_CHAR_LIMIT:
            break
        lines.append(line)
        total += len(line)
    return "\n".join(lines)


async def _call_llm(question: str, context: str) -> str:
    system = (
        "You are a knowledgeable assistant with access to a company knowledge graph. "
        "Answer the user's question using ONLY the context provided below. "
        "If the context does not contain enough information, say so clearly. "
        "Be concise and factual."
    )
    user_message = f"Context:\n{context}\n\nQuestion: {question}"

    response = await _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content or ""
