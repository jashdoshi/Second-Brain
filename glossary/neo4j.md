# Neo4j — Graph Database

## What is it?

Neo4j is a **graph database**. Unlike a regular database (rows and columns), Neo4j stores data as:

- **Nodes** — things (a concept, a person, a paper)
- **Edges** (called "relationships" in Neo4j) — connections between things (`RAG` → `uses` → `Vector Search`)
- **Properties** — key-value data attached to nodes or edges (`name: "RAG"`, `type: "concept"`)

Think of it like a mind map stored in a database.

---

## Why use it instead of a regular database?

A regular SQL database can represent relationships, but it's painful — you need join tables, and querying "find all concepts connected to X within 2 hops" requires complex, slow SQL.

In Neo4j, that's one line:
```cypher
MATCH (n)-[*1..2]-(neighbor) WHERE n.id = $id RETURN neighbor
```

Relationships are first-class citizens, not an afterthought.

---

## Cypher — Neo4j's query language

Cypher is to Neo4j what SQL is to Postgres. The syntax is visual — it looks like ASCII art of a graph.

### Basic patterns

```cypher
-- Find a node
MATCH (n:Node {name: "RAG"}) RETURN n

-- Find a relationship
MATCH (a:Node)-[:USES]->(b:Node) RETURN a, b

-- Create a node (use MERGE, not CREATE — see gotchas below)
MERGE (n:Node {id: $id}) SET n.name = $name, n.type = $type

-- Shortest path between two nodes
MATCH p = shortestPath((a:Node {id: $id_a})-[*]-(b:Node {id: $id_b}))
RETURN p
```

---

## Vector indexes — semantic search inside Neo4j

This is what makes Neo4j special for this project: it can do **vector similarity search** natively, without a separate tool like Pinecone or ChromaDB.

We store a 1536-dimension embedding on every node. When you ask a question, we embed the question and ask Neo4j: "which nodes have embeddings closest to this one?"

### Creating the index (done once on startup)
```cypher
CREATE VECTOR INDEX node_embeddings IF NOT EXISTS
FOR (n:Node) ON (n.embedding)
OPTIONS {indexConfig: {`vector.dimensions`: 1536, `vector.similarity_function`: 'cosine'}}
```

- **`IF NOT EXISTS`** — makes it safe to run every time the app starts (idempotent)
- **`cosine`** — measures the angle between two vectors, not the distance. Good for semantic similarity.

### Querying the vector index
```cypher
CALL db.index.vector.queryNodes('node_embeddings', $top_k, $embedding)
YIELD node, score
RETURN node, score
```

---

## MERGE vs CREATE — the most important gotcha

Always use `MERGE`, never `CREATE`, when writing nodes or edges.

- `CREATE` always creates a new record, even if one with the same ID already exists → **duplicates**
- `MERGE` finds an existing record first, only creates if it doesn't exist → **safe**

```cypher
-- WRONG: creates a duplicate every time you ingest the same concept
CREATE (n:Node {id: $id, name: $name})

-- RIGHT: finds existing node or creates it once
MERGE (n:Node {id: $id}) SET n.name = $name
```

---

## Connection — how Python talks to Neo4j

```python
from neo4j import AsyncGraphDatabase

driver = AsyncGraphDatabase.driver(uri, auth=(username, password))

async with driver.session() as session:
    result = await session.run("MATCH (n:Node) RETURN n LIMIT 10")
    records = await result.data()
```

Always use `async` versions in this project since FastAPI is async throughout.

---

## Local vs Production

| | Local dev | Production |
|---|---|---|
| How it runs | Docker container (`docker compose up -d`) | Neo4j AuraDB (cloud) |
| Connection URI | `neo4j://localhost:7687` | `neo4j+s://xxxx.databases.neo4j.io` |
| Auth | Set in `docker-compose.yml` | Set as env vars in Railway |

The `+s` in the AuraDB URI means the connection is TLS-encrypted. Never use a plain `neo4j://` URI in production.

---

*Last updated: 2026-06-27*
