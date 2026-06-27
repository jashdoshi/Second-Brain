import logging
import uuid
from typing import Any

from neo4j import GraphDatabase

from config import settings
from services import embedder

logger = logging.getLogger(__name__)

# neo4j+s:// and bolt+s:// schemes handle TLS automatically — no extra SSL config needed.
_driver = GraphDatabase.driver(
    settings.neo4j_uri,
    auth=(settings.neo4j_username, settings.neo4j_password),
)


def ping() -> None:
    """Verify the Neo4j driver can reach the database."""
    _driver.verify_connectivity()


def ensure_vector_index() -> None:
    """Create the node embedding vector index if it does not exist (idempotent)."""
    cypher = (
        "CREATE VECTOR INDEX node_embeddings IF NOT EXISTS "
        "FOR (n:Node) ON (n.embedding) "
        "OPTIONS {indexConfig: {"
        "`vector.dimensions`: 384, "
        "`vector.similarity_function`: 'cosine'"
        "}}"
    )
    with _driver.session(database=settings.neo4j_database) as session:
        session.run(cypher)
    logger.info("Vector index ensured")


def upsert_document(filename: str, content: str, source: str = "") -> str:
    """
    MERGE a document node. Returns its id.
    The document itself is embedded so it can appear in vector search results.
    """
    node_id = _stable_id("doc", filename)
    embedding = embedder.embed(content)
    cypher = """
        MERGE (n:Node {id: $id})
        SET n.name = $name,
            n.type = 'document',
            n.content = $content,
            n.source = $source,
            n.embedding = $embedding
        RETURN n.id AS id
    """
    with _driver.session(database=settings.neo4j_database) as session:
        session.run(
            cypher,
            id=node_id,
            name=filename,
            content=content[:5000],
            source=source,
            embedding=embedding,
        )
    logger.info("Upserted document node: %s", filename)
    return node_id


def upsert_nodes(
    nodes: list[dict[str, str]],
    doc_id: str,
) -> dict[str, str]:
    """
    MERGE concept nodes extracted from a document.
    Returns a mapping of node name → node id for edge creation.
    """
    names = [n["name"] for n in nodes]
    summaries = [n.get("summary", n["name"]) for n in nodes]
    embeddings = embedder.embed_batch(summaries)

    name_to_id: dict[str, str] = {}
    cypher = """
        MERGE (n:Node {name: $name})
        ON CREATE SET n.id = $id
        SET n.type = $type,
            n.content = $content,
            n.embedding = $embedding
        RETURN n.id AS id
    """
    with _driver.session(database=settings.neo4j_database) as session:
        for node, emb in zip(nodes, embeddings):
            node_id = _stable_id("concept", node["name"])
            result = session.run(
                cypher,
                id=node_id,
                name=node["name"],
                type=node.get("type", "concept"),
                content=node.get("summary", node["name"]),
                embedding=emb,
            )
            record = result.single()
            actual_id = record["id"] if record else node_id
            name_to_id[node["name"]] = actual_id

    _link_concepts_to_document(list(name_to_id.values()), doc_id)
    return name_to_id


def _link_concepts_to_document(concept_ids: list[str], doc_id: str) -> None:
    """Create SOURCED_FROM edges from every concept node to the document node."""
    cypher = """
        MATCH (concept:Node {id: $concept_id})
        MATCH (doc:Node {id: $doc_id})
        MERGE (concept)-[:SOURCED_FROM]->(doc)
    """
    with _driver.session(database=settings.neo4j_database) as session:
        for concept_id in concept_ids:
            session.run(cypher, concept_id=concept_id, doc_id=doc_id)


def upsert_edges(
    edges: list[dict[str, str]],
    name_to_id: dict[str, str],
) -> None:
    """MERGE relationship edges between concept nodes."""
    cypher = """
        MATCH (a:Node {id: $from_id})
        MATCH (b:Node {id: $to_id})
        MERGE (a)-[r:RELATES {relation: $relation}]->(b)
    """
    with _driver.session(database=settings.neo4j_database) as session:
        for edge in edges:
            from_id = name_to_id.get(edge.get("from", ""))
            to_id = name_to_id.get(edge.get("to", ""))
            if not from_id or not to_id:
                logger.warning("Skipping edge — unknown node: %s", edge)
                continue
            session.run(
                cypher,
                from_id=from_id,
                to_id=to_id,
                relation=edge.get("relation", "relates_to"),
            )


def get_all_nodes_and_edges() -> dict[str, Any]:
    """Return all nodes and edges for the frontend graph render."""
    nodes_cypher = "MATCH (n:Node) RETURN n"
    edges_cypher = "MATCH (a:Node)-[r]->(b:Node) RETURN a.id AS from_id, b.id AS to_id, type(r) AS type, r.relation AS relation"

    with _driver.session(database=settings.neo4j_database) as session:
        node_records = session.run(nodes_cypher).data()
        edge_records = session.run(edges_cypher).data()

    nodes = [_serialize_node(r["n"]) for r in node_records]
    edges = [
        {
            "from_id": r["from_id"],
            "to_id": r["to_id"],
            "relation": r["relation"] or r["type"],
        }
        for r in edge_records
    ]
    return {"nodes": nodes, "edges": edges}


def vector_search(embedding: list[float], top_k: int = 5) -> list[dict[str, Any]]:
    """Return the top-k nodes most similar to the given embedding."""
    cypher = """
        CALL db.index.vector.queryNodes('node_embeddings', $k, $embedding)
        YIELD node, score
        RETURN node, score
    """
    with _driver.session(database=settings.neo4j_database) as session:
        records = session.run(cypher, k=top_k, embedding=embedding).data()
    return [{"node": _serialize_node(r["node"]), "score": r["score"]} for r in records]


def get_neighbors(node_id: str, depth: int = 2) -> list[dict[str, Any]]:
    """Return all nodes reachable from node_id within the given hop depth."""
    # Neo4j does not allow parameters in variable-length path ranges — depth must be inlined.
    cypher = f"""
        MATCH (start:Node {{id: $id}})-[*1..{depth}]-(neighbor:Node)
        RETURN DISTINCT neighbor
    """
    with _driver.session(database=settings.neo4j_database) as session:
        records = session.run(cypher, id=node_id).data()
    return [_serialize_node(r["neighbor"]) for r in records]


def clear_all() -> dict[str, int]:
    """Delete every node and relationship in the graph. Returns counts deleted."""
    count_cypher = "MATCH (n) RETURN count(n) AS node_count"
    delete_cypher = "MATCH (n) DETACH DELETE n"
    with _driver.session(database=settings.neo4j_database) as session:
        node_count = session.run(count_cypher).single()["node_count"]
        session.run(delete_cypher)
    logger.info("Cleared graph: %d nodes deleted", node_count)
    return {"nodes_deleted": node_count}


def find_path(name_a: str, name_b: str) -> list[dict[str, Any]]:
    """Return the shortest path between two nodes matched by name."""
    cypher = """
        MATCH (a:Node {name: $name_a}), (b:Node {name: $name_b}),
              p = shortestPath((a)-[*]-(b))
        RETURN [n IN nodes(p) | n] AS path_nodes
    """
    with _driver.session(database=settings.neo4j_database) as session:
        result = session.run(cypher, name_a=name_a, name_b=name_b).single()
    if not result:
        return []
    return [_serialize_node(n) for n in result["path_nodes"]]


def clear_all() -> dict[str, int]:
    """Delete all nodes and relationships from Neo4j."""
    cypher = "MATCH (n) DETACH DELETE n RETURN count(n) AS deleted"
    with _driver.session(database=settings.neo4j_database) as session:
        result = session.run(cypher).single()
    deleted = result["deleted"] if result else 0
    logger.info("Cleared graph: %d nodes deleted", deleted)
    return {"nodes_deleted": deleted}


def _serialize_node(node: Any) -> dict[str, Any]:
    """Convert a Neo4j node to a plain dict, omitting the embedding vector."""
    data = dict(node)
    data.pop("embedding", None)
    return data


def _stable_id(prefix: str, key: str) -> str:
    """Generate a deterministic UUID from a prefix + key string."""
    namespace = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
    return str(uuid.uuid5(namespace, f"{prefix}:{key}"))
