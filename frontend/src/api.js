const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function _handleResponse(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Fetch all nodes and edges for the 3D graph renderer.
 * @returns {Promise<{nodes: Array, edges: Array}>}
 */
export async function fetchGraph() {
  return _handleResponse(await fetch(`${BASE}/graph`));
}

/**
 * Upload a file and get an AI extraction preview without writing to Neo4j.
 * @param {File} file
 * @param {string} [source]
 */
export async function previewIngest(file, source = '') {
  const form = new FormData();
  form.append('file', file);
  form.append('source', source);
  form.append('commit', 'false');
  return _handleResponse(await fetch(`${BASE}/ingest`, { method: 'POST', body: form }));
}

/**
 * Upload a file and commit the extracted entities to Neo4j.
 * @param {File} file
 * @param {string} [source]
 */
export async function confirmIngest(file, source = '') {
  const form = new FormData();
  form.append('file', file);
  form.append('source', source);
  form.append('commit', 'true');
  return _handleResponse(await fetch(`${BASE}/ingest`, { method: 'POST', body: form }));
}

/**
 * Delete all nodes and relationships from the graph.
 * @returns {Promise<{nodes_deleted: number}>}
 */
export async function clearGraph() {
  return _handleResponse(await fetch(`${BASE}/graph`, { method: 'DELETE' }));
}

/**
 * Ask a natural-language question against the knowledge graph.
 * @param {string} question
 * @returns {Promise<{answer: string, source_node_ids: string[]}>}
 */
export async function queryGraph(question) {
  return _handleResponse(
    await fetch(`${BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    }),
  );
}
