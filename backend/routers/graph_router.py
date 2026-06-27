import logging
from typing import Any

from fastapi import APIRouter

from services import graph

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/graph")
async def get_graph() -> dict[str, Any]:
    """Return all nodes and edges for the 3D graph frontend."""
    return graph.get_all_nodes_and_edges()


@router.delete("/graph")
async def delete_graph() -> dict[str, int]:
    """Delete all nodes and relationships from Neo4j."""
    return graph.clear_all()
