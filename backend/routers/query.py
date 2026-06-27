import logging

from fastapi import APIRouter
from pydantic import BaseModel

from services.rag import RAGResponse, answer

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query", response_model=RAGResponse)
async def query_graph(body: QueryRequest) -> RAGResponse:
    """Answer a natural-language question using Graph-RAG over the knowledge base."""
    logger.info("Query received: %s", body.question[:80])
    return await answer(body.question)
