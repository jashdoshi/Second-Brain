import logging
from typing import Any

from fastapi import APIRouter, Form, UploadFile
from pydantic import BaseModel

from services import extractor, graph

logger = logging.getLogger(__name__)

router = APIRouter()


class IngestPreviewResponse(BaseModel):
    document_id: str
    filename: str
    node_count: int
    edge_count: int
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    committed: bool


@router.post("/ingest", response_model=IngestPreviewResponse)
async def ingest_document(
    file: UploadFile,
    source: str = Form(default=""),
    commit: bool = Form(default=False),
) -> IngestPreviewResponse:
    """
    Upload a PDF, DOCX, or MD file.

    - When commit=false (default): returns extracted entities preview without writing to Neo4j.
    - When commit=true: writes document node, concept nodes, and edges to Neo4j.
    """
    filename = file.filename or "untitled"
    logger.info("Ingesting file: %s (commit=%s)", filename, commit)

    text = await extractor.parse_file(file)
    extracted = await extractor.extract_entities(text)

    nodes_preview = [
        {"name": n.name, "type": n.type, "summary": n.summary}
        for n in extracted.nodes
    ]
    edges_preview = [
        {"from": e.from_name, "to": e.to_name, "relation": e.relation}
        for e in extracted.edges
    ]

    doc_id = ""
    if commit:
        doc_id = graph.upsert_document(filename, text, source)
        name_to_id = graph.upsert_nodes(
            [{"name": n.name, "type": n.type, "summary": n.summary} for n in extracted.nodes],
            doc_id,
        )
        graph.upsert_edges(
            [{"from": e.from_name, "to": e.to_name, "relation": e.relation} for e in extracted.edges],
            name_to_id,
        )
        logger.info("Committed document '%s' with %d nodes", filename, len(extracted.nodes))

    return IngestPreviewResponse(
        document_id=doc_id,
        filename=filename,
        node_count=len(extracted.nodes),
        edge_count=len(extracted.edges),
        nodes=nodes_preview,
        edges=edges_preview,
        committed=commit,
    )
