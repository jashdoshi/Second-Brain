import io
import json
import logging
from typing import Any

import docx
import pypdf
from fastapi import UploadFile
from openai import AsyncOpenAI
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

_client = AsyncOpenAI(api_key=settings.openai_api_key)

_SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}

# How many chars of document text are sent to the LLM for entity extraction.
# Larger values cost more tokens; 8000 chars covers ~5–6 pages of dense text.
_EXTRACTION_CHAR_LIMIT = 8000


class ExtractedNode(BaseModel):
    name: str
    type: str = "concept"
    summary: str = ""


class ExtractedEdge(BaseModel):
    from_name: str
    to_name: str
    relation: str = "relates_to"


class ExtractedGraph(BaseModel):
    nodes: list[ExtractedNode]
    edges: list[ExtractedEdge]


async def parse_file(file: UploadFile) -> str:
    """Extract plain text from a PDF, DOCX, or MD/TXT upload."""
    filename = file.filename or ""
    ext = _extension(filename)
    if ext not in _SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '{ext}'. Accepted: {', '.join(_SUPPORTED_EXTENSIONS)}"
        )

    raw_bytes = await file.read()

    if ext == ".pdf":
        return _parse_pdf(raw_bytes)
    if ext == ".docx":
        return _parse_docx(raw_bytes)
    return raw_bytes.decode("utf-8", errors="replace")


async def extract_entities(text: str) -> ExtractedGraph:
    """
    Send document text to gpt-4o-mini and return structured entities + relationships.
    Only the first _EXTRACTION_CHAR_LIMIT characters are sent to stay within token limits.
    """
    excerpt = text[:_EXTRACTION_CHAR_LIMIT]
    prompt = (
        "You are a knowledge graph builder. Extract key concepts and relationships "
        "from the document text below.\n\n"
        "Return ONLY a JSON object with two keys:\n"
        '- "nodes": array of {name, type, summary} '
        '  (type is one of: concept, tool, person, organization, idea)\n'
        '- "edges": array of {from_name, to_name, relation} '
        '  (relation is one of: uses, part_of, contrasts_with, leads_to, created_by, mentions)\n\n'
        "Extract 5–15 nodes and relevant edges. Use short, clear names.\n\n"
        f"Document:\n{excerpt}"
    )

    response = await _client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    raw: dict[str, Any] = json.loads(response.choices[0].message.content or "{}")
    nodes = [
        ExtractedNode(
            name=n.get("name", ""),
            type=n.get("type", "concept"),
            summary=n.get("summary", ""),
        )
        for n in raw.get("nodes", [])
        if n.get("name")
    ]
    edges = [
        ExtractedEdge(
            from_name=e.get("from_name", e.get("from", "")),
            to_name=e.get("to_name", e.get("to", "")),
            relation=e.get("relation", "relates_to"),
        )
        for e in raw.get("edges", [])
        if e.get("from_name") or e.get("from")
    ]
    return ExtractedGraph(nodes=nodes, edges=edges)


def _parse_pdf(data: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def _parse_docx(data: bytes) -> str:
    doc = docx.Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _extension(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot != -1 else ""
