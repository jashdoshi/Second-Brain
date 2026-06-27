import { useMemo } from 'react';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return `added ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NodeDetail({ node, allNodes, allEdges, onNodeSelect, onClose }) {
  const nodeMap = useMemo(() => {
    const m = new Map();
    allNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [allNodes]);

  const connections = useMemo(() => {
    const out = [];
    allEdges.forEach((e) => {
      if (e.from_id === node.id) {
        const target = nodeMap.get(e.to_id);
        if (target) out.push({ relation: e.relation, name: target.name, id: target.id });
      } else if (e.to_id === node.id) {
        const source = nodeMap.get(e.from_id);
        if (source) out.push({ relation: `← ${e.relation}`, name: source.name, id: source.id });
      }
    });
    return out;
  }, [node.id, allEdges, nodeMap]);

  return (
    <div className="panel node-detail-panel">
      <div className="node-detail-type">
        {node.type ?? 'concept'}{node.topic ? ` · ${node.topic}` : ''}
      </div>

      <div className="node-detail-name">{node.name}</div>

      {node.content && (
        <p className="node-detail-body">{node.content}</p>
      )}

      {connections.length > 0 && (
        <div>
          <div className="node-connections-label">connections</div>
          <div className="connections-table">
            {connections.map((c, i) => (
              <div key={i} className="connections-row">
                <span className="connections-rel">{c.relation}</span>
                <span
                  className="connections-name"
                  onClick={() => onNodeSelect(nodeMap.get(c.id) ?? null)}
                >
                  {c.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {node.source && (
        <div style={{ font: '300 7px var(--font-mono)', color: '#bbb', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <a href={node.source} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
            {node.source}
          </a>
        </div>
      )}

      <div className="node-detail-meta">
        {formatDate(node.created_at)}
        {connections.length > 0 && ` · ${connections.length} connections`}
      </div>

      {/* Close button at bottom */}
      <button
        className="btn-cancel"
        style={{ marginTop: 4, alignSelf: 'flex-start' }}
        onClick={onClose}
      >
        close
      </button>
    </div>
  );
}
