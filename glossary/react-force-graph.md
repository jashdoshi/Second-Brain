# react-force-graph-3d — 3D Graph Rendering

## What is it?

`react-force-graph-3d` is a React component that renders an interactive 3D graph in the browser. You give it nodes and links, and it:

- Runs a physics simulation (force-directed layout) so nodes arrange themselves naturally
- Renders everything in 3D using WebGL (via Three.js under the hood)
- Handles mouse/touch interaction (rotate, zoom, click)

The result: a 3D floating web of concepts you can spin around and explore.

---

## Why force-directed layout?

A force-directed graph treats edges as springs (attraction) and nodes as magnets (repulsion). The simulation runs until everything settles into a stable position where:
- Connected nodes are pulled together (because of their shared edge)
- Unconnected nodes push apart (to avoid clutter)

The result is a layout where **clusters of related concepts naturally group together** — you can visually see which topics are tightly connected without reading any labels.

---

## Basic usage

```jsx
import ForceGraph3D from 'react-force-graph-3d';

function GraphCanvas({ nodes, edges, highlightedIds }) {
  const graphData = {
    nodes: nodes.map(n => ({ id: n.id, name: n.name, connections: n.degree })),
    links: edges.map(e => ({ source: e.from_id, target: e.to_id, label: e.relation }))
  };

  return (
    <ForceGraph3D
      graphData={graphData}
      nodeColor={node => highlightedIds.includes(node.id) ? 'white' : 'grey'}
      nodeVal={node => node.connections}   // bigger node = more connections
      onNodeClick={node => handleNodeSelect(node)}
    />
  );
}
```

---

## How it's used in this project

### `GraphCanvas.jsx`
- **Fetches** `GET /graph` on mount to load all nodes and edges from Neo4j
- **Colors** nodes white if they're in `highlightedIds` (returned by `/query`), grey otherwise
- **Sizes** nodes by their connection count — more connected concepts appear larger
- **On click** — opens a detail panel showing that node's content and connected concepts

### The highlight flow
```
User asks question in ChatPanel
    ↓
POST /query → returns answer + source_node_ids
    ↓
ChatPanel calls onHighlight(source_node_ids)
    ↓
highlightedIds state updates in App.jsx
    ↓
GraphCanvas re-renders with new colors
    ↓
Relevant nodes light up white in 3D
```

---

## Key props

| Prop | What it does |
|---|---|
| `graphData` | `{ nodes: [...], links: [...] }` |
| `nodeColor` | Function that returns a color string per node |
| `nodeVal` | Function that returns a size value per node |
| `onNodeClick` | Callback when a node is clicked |
| `nodeLabel` | Tooltip text shown on hover |
| `linkLabel` | Label shown on edge hover |

---

## Performance consideration

The 3D rendering is GPU-intensive. For very large graphs (thousands of nodes), the simulation can slow down. At personal knowledge graph scale (hundreds of nodes), it performs well.

---

*Last updated: 2026-06-27*
